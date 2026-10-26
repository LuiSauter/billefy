using System.Globalization;
using System.Text.RegularExpressions;
using Ingestion.Domain.Drafts;

namespace Ingestion.Application.Parsing;

public sealed partial class RuleBasedFinancialParser : IFinancialTextParser
{
    private static readonly Regex IncomeRegex = new(
        @"\b(recibiste|recibido|dep[oó]sito|abono|acreditad[oa]|ingreso|transferencia recibida|reembolso|received|deposit|credited|refund)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ExpenseRegex = new(
        @"\b(pagaste|pago\s+realizado|compra|retiro|transferencia enviada|transferiste|d[eé]bito|consumo|paid|spent|withdrew|sent|payment|debit)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ReferenceRegex = new(
        @"\b(?:ref(?:erencia)?|nro\.?|transacci[oó]n|op(?:eraci[oó]n)?|tx)\s*[:#]?\s*([A-Za-z0-9_-]{4,30})\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Currency and Amount patterns
    // 1. Bolivianos: Bs. 150.00 / 150,50 Bs / BOB 50
    private static readonly Regex BobPrefixRegex = new(
        @"\b(?:Bs\.?|BOB)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex BobSuffixRegex = new(
        @"\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:Bs\.?|BOB)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // 2. US Dollars: $150.00 / USD 50 / 50 USD
    private static readonly Regex UsdPrefixRegex = new(
        @"(?:\$|US\$|USD)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex UsdSuffixRegex = new(
        @"\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:USD|US\$)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // 3. USDT
    private static readonly Regex UsdtPrefixRegex = new(
        @"(?:USDT)\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex UsdtSuffixRegex = new(
        @"\b([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})|[0-9]+(?:[.,][0-9]{1,2})?)\s*(?:USDT)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public FinancialParseResult Parse(string text, DateTime receivedAt)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return FinancialParseResult.Failed("Empty or whitespace text.");
        }

        // 1. Extract Currency and Amount
        var (amountFound, amount, currency) = ExtractAmountAndCurrency(text);
        if (!amountFound || amount <= 0)
        {
            return FinancialParseResult.Failed("Could not extract a valid amount and currency.");
        }

        // 2. Extract Direction
        var isIncome = IncomeRegex.IsMatch(text);
        var isExpense = ExpenseRegex.IsMatch(text);

        DraftDirection direction;
        decimal confidence = 0.85m;

        if (isIncome && !isExpense)
        {
            direction = DraftDirection.Income;
        }
        else if (isExpense && !isIncome)
        {
            direction = DraftDirection.Expense;
        }
        else if (isIncome && isExpense)
        {
            // Pick based on first match index in string
            var incomeIndex = IncomeRegex.Match(text).Index;
            var expenseIndex = ExpenseRegex.Match(text).Index;
            direction = incomeIndex < expenseIndex ? DraftDirection.Income : DraftDirection.Expense;
            confidence = 0.75m;
        }
        else
        {
            // Neither explicitly found
            return FinancialParseResult.Failed("Could not determine transaction direction.");
        }

        // 3. Extract Reference
        string? reference = null;
        var refMatch = ReferenceRegex.Match(text);
        if (refMatch.Success)
        {
            reference = refMatch.Groups[1].Value;
            confidence = Math.Min(1.00m, confidence + 0.10m);
        }

        return new FinancialParseResult(
            Success: true,
            Amount: amount,
            Currency: currency,
            Direction: direction,
            Reference: reference,
            Confidence: confidence,
            AccountHint: null);
    }

    private static (bool success, decimal amount, string currency) ExtractAmountAndCurrency(string text)
    {
        // Try USDT
        var usdtMatch = UsdtPrefixRegex.Match(text);
        if (!usdtMatch.Success) usdtMatch = UsdtSuffixRegex.Match(text);
        if (usdtMatch.Success && TryParseAmount(usdtMatch.Groups[1].Value, out var usdtAmount))
        {
            return (true, usdtAmount, "USDT");
        }

        // Try BOB
        var bobMatch = BobPrefixRegex.Match(text);
        if (!bobMatch.Success) bobMatch = BobSuffixRegex.Match(text);
        if (bobMatch.Success && TryParseAmount(bobMatch.Groups[1].Value, out var bobAmount))
        {
            return (true, bobAmount, "BOB");
        }

        // Try USD
        var usdMatch = UsdPrefixRegex.Match(text);
        if (!usdMatch.Success) usdMatch = UsdSuffixRegex.Match(text);
        if (usdMatch.Success && TryParseAmount(usdMatch.Groups[1].Value, out var usdAmount))
        {
            return (true, usdAmount, "USD");
        }

        return (false, 0m, string.Empty);
    }

    private static bool TryParseAmount(string raw, out decimal result)
    {
        result = 0m;
        if (string.IsNullOrWhiteSpace(raw)) return false;

        var clean = raw.Trim();

        // Handle European format: 1.250,50 -> 1250.50
        if (clean.Contains('.') && clean.Contains(','))
        {
            var dotIndex = clean.LastIndexOf('.');
            var commaIndex = clean.LastIndexOf(',');

            if (commaIndex > dotIndex)
            {
                // comma is decimal separator
                clean = clean.Replace(".", "").Replace(',', '.');
            }
            else
            {
                // dot is decimal separator
                clean = clean.Replace(",", "");
            }
        }
        else if (clean.Contains(','))
        {
            // Only comma: e.g. 150,50
            clean = clean.Replace(',', '.');
        }

        return decimal.TryParse(clean, NumberStyles.Number, CultureInfo.InvariantCulture, out result);
    }
}
