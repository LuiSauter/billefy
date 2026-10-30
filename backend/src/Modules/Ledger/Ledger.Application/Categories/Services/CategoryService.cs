using BuildingBlocks.Common;
using BuildingBlocks.Security;
using BuildingBlocks.Time;
using Ledger.Application.Abstractions;
using Ledger.Domain.Categories;
using Ledger.Domain.Transactions;

namespace Ledger.Application.Categories.Services;

public sealed class CategoryService(
    ICategoryRepository categoryRepository,
    IUnitOfWork unitOfWork,
    ICurrentUserContext userContext,
    IClock clock) : ICategoryService
{
    public async Task<Result<List<CategoryDto>>> GetCategoriesAsync(
        TransactionDirection? direction = null,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<List<CategoryDto>>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var categories = await categoryRepository.GetByUserIdAsync(
            userContext.UserId!.Value,
            cancellationToken);

        var dtos = categories
            .Select(MapToDto)
            .Where(dto => !direction.HasValue || string.Equals(dto.Direction, direction.Value.ToString(), StringComparison.OrdinalIgnoreCase))
            .ToList();

        return Result.Success(dtos);
    }

    public async Task<Result<CategoryDto>> CreateCategoryAsync(
        CreateCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure<CategoryDto>(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Result.Failure<CategoryDto>(
                Error.Validation("Category.InvalidName", "Category name is required."));
        }

        var iconKey = string.IsNullOrWhiteSpace(request.IconKey)
            ? (request.Direction == TransactionDirection.Income ? "briefcase" : "utensils")
            : request.IconKey.Trim();

        var colorKey = string.IsNullOrWhiteSpace(request.ColorKey)
            ? (request.Direction == TransactionDirection.Income ? "emerald" : "rose")
            : request.ColorKey.Trim();

        var encodedMetadata = EncodeIconMetadata(request.Direction, iconKey, colorKey);

        var category = Category.Create(
            userContext.UserId!.Value,
            request.Name.Trim(),
            parentCategoryId: null,
            icon: encodedMetadata,
            createdAt: clock.UtcNow,
            id: request.Id);

        await categoryRepository.AddAsync(category, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success(MapToDto(category));
    }

    public async Task<Result> DeleteCategoryAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        if (!userContext.IsAuthenticated)
        {
            return Result.Failure(
                Error.Unauthorized("Auth.Unauthorized", "User is not authenticated."));
        }

        var category = await categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category is null || category.UserId != userContext.UserId!.Value)
        {
            return Result.Failure(
                Error.NotFound("Category.NotFound", $"Category with id {id} was not found."));
        }

        categoryRepository.Remove(category);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static string EncodeIconMetadata(TransactionDirection direction, string iconKey, string colorKey)
    {
        var raw = $"{direction}|{iconKey}|{colorKey}";
        return raw.Length <= 50 ? raw : raw[..50];
    }

    private static CategoryDto MapToDto(Category category)
    {
        var direction = TransactionDirection.Expense.ToString();
        var iconKey = "sparkles";
        var colorKey = "blue";

        if (!string.IsNullOrWhiteSpace(category.Icon))
        {
            var parts = category.Icon.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length == 3)
            {
                direction = parts[0];
                iconKey = parts[1];
                colorKey = parts[2];
            }
            else
            {
                iconKey = category.Icon;
            }
        }

        return new CategoryDto(
            category.Id,
            category.Name,
            direction,
            iconKey,
            colorKey,
            category.CreatedAt);
    }
}
