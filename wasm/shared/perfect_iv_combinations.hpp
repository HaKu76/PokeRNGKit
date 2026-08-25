/* PokeRNGKit shared filtered IV combination indexing. GPL-3.0-or-later. */
#pragma once

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>

namespace pokerngkit
{
using IvCombination = std::array<std::uint8_t, 6>;
using IvBounds = std::array<std::uint32_t, 6>;

inline std::uint64_t ivCombinationsAtLeast(const std::array<std::uint64_t, 7> &counts,
                                           std::uint32_t minimum)
{
    if (minimum == 0)
    {
        std::uint64_t total = 0;
        for (const auto count : counts) total += count;
        return total;
    }
    if (minimum > 6) return 0;
    std::uint64_t total = 0;
    for (std::size_t count = minimum; count < counts.size(); count++) total += counts[count];
    return total;
}

inline std::array<std::array<std::uint64_t, 7>, 7> ivSuffixCounts(const IvBounds &minimum,
                                                                   const IvBounds &maximum,
                                                                   std::uint32_t perfectValue)
{
    std::array<std::array<std::uint64_t, 7>, 7> suffix {};
    suffix[6][0] = 1;
    for (int stat = 5; stat >= 0; stat--)
    {
        const auto width = maximum[stat] - minimum[stat] + 1;
        const auto perfect = maximum[stat] >= perfectValue
                                 ? maximum[stat] - std::max(minimum[stat], perfectValue) + 1
                                 : 0;
        const auto ordinary = width - perfect;
        for (std::size_t exact = 0; exact <= 6; exact++)
        {
            suffix[stat][exact] = ordinary * suffix[stat + 1][exact]
                + perfect * (exact == 0 ? 0 : suffix[stat + 1][exact - 1]);
        }
    }
    return suffix;
}

inline std::uint64_t countIvCombinations(const IvBounds &minimum, const IvBounds &maximum,
                                         std::uint32_t perfectValue, std::uint32_t perfectCount)
{
    const auto suffix = ivSuffixCounts(minimum, maximum, perfectValue);
    return ivCombinationsAtLeast(suffix[0], perfectCount);
}

inline IvCombination ivCombinationAtIndex(std::uint64_t index, const IvBounds &minimum,
                                           const IvBounds &maximum, std::uint32_t perfectValue,
                                           std::uint32_t perfectCount)
{
    const auto suffix = ivSuffixCounts(minimum, maximum, perfectValue);
    const auto total = ivCombinationsAtLeast(suffix[0], perfectCount);
    if (index >= total) return {};

    IvCombination ivs {};
    std::uint32_t perfect = 0;
    for (std::size_t stat = 0; stat < ivs.size(); stat++)
    {
        for (std::uint32_t value = minimum[stat]; value <= maximum[stat]; value++)
        {
            const auto nextPerfect = perfect + (value >= perfectValue ? 1U : 0U);
            const auto completions = ivCombinationsAtLeast(
                suffix[stat + 1], perfectCount > nextPerfect ? perfectCount - nextPerfect : 0);
            if (index < completions)
            {
                ivs[stat] = static_cast<std::uint8_t>(value);
                perfect = nextPerfect;
                break;
            }
            index -= completions;
        }
    }
    return ivs;
}
} // namespace pokerngkit
