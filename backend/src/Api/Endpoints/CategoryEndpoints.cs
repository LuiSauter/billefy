using Api.Common;
using Ledger.Application.Categories.Services;
using Ledger.Domain.Transactions;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints;

public static class CategoryEndpoints
{
    public static RouteGroupBuilder MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/v1/categories")
            .WithTags("Categories")
            .RequireAuthorization();

        group.MapGet("/", async (
            [FromQuery] TransactionDirection? direction,
            ICategoryService service,
            CancellationToken ct) =>
        {
            var result = await service.GetCategoriesAsync(direction, ct);
            return result.ToHttpResult();
        })
        .WithName("GetCategories")
        .Produces<List<CategoryDto>>(StatusCodes.Status200OK)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPost("/", async (
            [FromBody] CreateCategoryRequest request,
            ICategoryService service,
            CancellationToken ct) =>
        {
            var result = await service.CreateCategoryAsync(request, ct);
            return result.ToHttpResult(dto => Results.Created($"/v1/categories/{dto.Id}", dto));
        })
        .WithName("CreateCategory")
        .Produces<CategoryDto>(StatusCodes.Status201Created)
        .ProducesProblem(StatusCodes.Status400BadRequest)
        .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapDelete("/{id:guid}", async (
            [FromRoute] Guid id,
            ICategoryService service,
            CancellationToken ct) =>
        {
            var result = await service.DeleteCategoryAsync(id, ct);
            return result.ToHttpResult(() => Results.NoContent());
        })
        .WithName("DeleteCategory")
        .Produces(StatusCodes.Status204NoContent)
        .ProducesProblem(StatusCodes.Status401Unauthorized)
        .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }
}
