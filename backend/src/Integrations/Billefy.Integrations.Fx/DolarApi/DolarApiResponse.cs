using System.Text.Json.Serialization;

namespace Billefy.Integrations.Fx.DolarApi;

public sealed record DolarApiResponse
{
    [JsonPropertyName("moneda")]
    public string? Moneda { get; init; }

    [JsonPropertyName("casa")]
    public string? Casa { get; init; }

    [JsonPropertyName("nombre")]
    public string? Nombre { get; init; }

    [JsonPropertyName("compra")]
    public decimal Compra { get; init; }

    [JsonPropertyName("venta")]
    public decimal Venta { get; init; }

    [JsonPropertyName("fechaActualizacion")]
    public DateTime? FechaActualizacion { get; init; }
}
