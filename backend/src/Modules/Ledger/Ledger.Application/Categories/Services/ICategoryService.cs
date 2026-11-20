using BuildingBlocks.Common;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Categories.Services;

public sealed record CreateCategoryRequest(
    string Name,
    TransactionDirection Direction = TransactionDirection.Expense,
    string? IconKey = null,
    string? ColorKey = null,
    Guid? Id = null);

public sealed record CategoryDto(
    Guid Id,
    string Name,
    string Direction,
    string IconKey,
    string ColorKey,
    DateTime CreatedAt);

public interface ICategoryService
{
    Task<Result<List<CategoryDto>>> GetCategoriesAsync(
        TransactionDirection? direction = null,
        CancellationToken cancellationToken = default);

    Task<Result<CategoryDto>> CreateCategoryAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<Result> DeleteCategoryAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
