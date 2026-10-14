import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InventarioService } from '../../core/services/inventario.service';
import { ImportarInventarioFila, ImportarInventarioResultado } from '../../core/models/inventario.model';
import { decodificarArchivo, leerInventarioCsv } from '../../core/utils/csv-inventario';

const TAMANO_LOTE = 500;

// Consulta de SOLO LECTURA para exportar el inventario de World Office desde SSMS. Los números salen como
// texto (CONVERT) para que el separador decimal sea siempre el punto, sin importar la configuración regional.
const CONSULTA_EXPORTACION = `WITH Stock AS (
    SELECT IdInventario, SUM(Existencia) AS Existencia
    FROM dbo.Vista_ExistenciasPorBodegas
    WHERE IdBodegaInventario = N'Uno'
    GROUP BY IdInventario
),
UltimaVenta AS (
    SELECT i.IdInventario, i.MontoMonetarioUnitario AS PrecioUltimaVenta,
           ROW_NUMBER() OVER (PARTITION BY i.IdInventario ORDER BY a.Fecha DESC, i.[Renglón] DESC) AS rn
    FROM dbo.CCA_M_Inventarios i
    JOIN dbo.[CuentasContables - Asientos] a ON a.IdAsientoContable = i.IdAsientoContable
    WHERE a.IdCuentaContableDocumento IN (N'REM', N'FV')
      AND (a.senAnulado = 0 OR a.senAnulado IS NULL)
      AND i.Cantidad > 0 AND i.MontoMonetarioUnitario > 0
)
SELECT p.IdInventario, p.[CódigoInventario] AS Codigo, p.[Descripción] AS Nombre, p.UnidadDeMedida AS Unidad,
       p.IdInventarioClase AS Clase,
       CAST(ROUND(p.Iva * 100, 0) AS int) AS IvaPorc,
       -- Un servicio no tiene stock: se deja vacío para que la app no muestre un saldo sin sentido.
       CASE WHEN p.IdInventarioClase = 2 THEN NULL
            ELSE CONVERT(varchar(40), CAST(ISNULL(s.Existencia, 0) AS decimal(18,4))) END AS ExistenciaUno,
       CONVERT(varchar(40), CAST(u.PrecioUltimaVenta AS decimal(18,2))) AS PrecioUltimaVenta
FROM dbo.Inventarios p
LEFT JOIN Stock s ON s.IdInventario = p.IdInventario
LEFT JOIN UltimaVenta u ON u.IdInventario = p.IdInventario AND u.rn = 1
-- Solo lo que se vende: Producto (1) o Servicio (2) que se haya vendido alguna vez o tenga existencia.
-- Se dejan por fuera gastos, activos fijos, diferidos, etc. y el catálogo sin movimiento.
WHERE p.Activo <> 0
  AND p.IdInventarioClase IN (1, 2)
  AND (u.IdInventario IS NOT NULL OR ISNULL(s.Existencia, 0) <> 0)
ORDER BY p.[CódigoInventario];`;

@Component({
  selector: 'app-importar-inventario',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule
  ],
  templateUrl: './importar-inventario.component.html',
  styleUrl: './importar-inventario.component.scss'
})
export class ImportarInventarioComponent {
  private readonly inventarioService = inject(InventarioService);
  private readonly snackBar = inject(MatSnackBar);

  readonly consulta = CONSULTA_EXPORTACION;

  readonly nombreArchivo = signal<string | null>(null);
  readonly filas = signal<ImportarInventarioFila[]>([]);
  readonly errores = signal<string[]>([]);
  readonly importando = signal(false);
  readonly progreso = signal(0);
  readonly resultado = signal<ImportarInventarioResultado | null>(null);
  readonly falloMensaje = signal<string | null>(null);

  // Hora en que se exportó de WO (datetime-local). Por defecto, la de modificación del archivo.
  exportadoEn = '';
  actualizarPrecios = false;

  readonly conExistencia = computed(() => this.filas().filter((f) => f.existencia !== null).length);
  readonly conPrecio = computed(() => this.filas().filter((f) => f.precio !== null).length);
  readonly muestra = computed(() => this.filas().slice(0, 8));

  copiarConsulta(): void {
    navigator.clipboard.writeText(this.consulta).then(
      () => this.snackBar.open('Consulta copiada', 'Cerrar', { duration: 2500 }),
      () => this.snackBar.open('No se pudo copiar; selecciónala y cópiala a mano.', 'Cerrar', { duration: 4000 })
    );
  }

  async alElegirArchivo(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (!archivo) return;

    this.resultado.set(null);
    this.falloMensaje.set(null);
    this.nombreArchivo.set(archivo.name);
    this.exportadoEn = this.aFechaLocal(new Date(archivo.lastModified));

    const texto = decodificarArchivo(await archivo.arrayBuffer());
    const leido = leerInventarioCsv(texto);
    this.filas.set(leido.filas);
    this.errores.set(leido.errores);
  }

  async importar(): Promise<void> {
    const todas = this.filas();
    if (todas.length === 0 || this.importando()) return;

    this.importando.set(true);
    this.resultado.set(null);
    this.falloMensaje.set(null);
    this.progreso.set(0);

    const exportado = this.exportadoEn ? new Date(this.exportadoEn).toISOString() : null;
    const total: ImportarInventarioResultado = {
      productosCreados: 0, productosActualizados: 0, omitidos: 0, existenciasCargadas: 0, preciosAsignados: 0, avisos: []
    };

    try {
      for (let i = 0; i < todas.length; i += TAMANO_LOTE) {
        const lote = todas.slice(i, i + TAMANO_LOTE);
        const r = await new Promise<ImportarInventarioResultado>((ok, fallo) =>
          this.inventarioService
            .importar({ filas: lote, actualizarPrecios: this.actualizarPrecios, exportadoEn: exportado })
            .subscribe({ next: ok, error: fallo })
        );

        total.productosCreados += r.productosCreados;
        total.productosActualizados += r.productosActualizados;
        total.omitidos += r.omitidos;
        total.existenciasCargadas += r.existenciasCargadas;
        total.preciosAsignados += r.preciosAsignados;
        total.avisos.push(...r.avisos.slice(0, 5));
        this.progreso.set(Math.min(100, Math.round(((i + lote.length) / todas.length) * 100)));
      }

      this.resultado.set(total);
      this.snackBar.open('Inventario importado', 'Cerrar', { duration: 3000 });
    } catch (error) {
      const mensaje = (error as { error?: { mensaje?: string } })?.error?.mensaje;
      this.falloMensaje.set(mensaje ?? 'La importación se interrumpió. Lo ya cargado se conserva; puedes repetirla sin duplicar.');
    } finally {
      this.importando.set(false);
    }
  }

  private aFechaLocal(fecha: Date): string {
    const dos = (n: number) => String(n).padStart(2, '0');
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
  }
}
