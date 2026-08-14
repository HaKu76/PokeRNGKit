/*
 * PokeRNGKit Gen V Adjacent Seeds native parity fixture
 * Copyright (C) 2026 Hakuhiro
 * GPL-3.0-or-later
 */
#include "gen5adjacentseeds_bridge.h"

#include <array>
#include <cstdint>
#include <iostream>

namespace
{
    constexpr std::uint64_t mac = 41860346966ULL;

    Gen5AdjacentSeedsPackedRequest request(std::uint32_t version, std::uint32_t vcount, std::uint32_t timer0)
    {
        Gen5AdjacentSeedsPackedRequest value = {};
        value.version = version;
        value.macLow = static_cast<std::uint32_t>(mac);
        value.macHigh = static_cast<std::uint32_t>(mac >> 32);
        value.vcount = vcount;
        value.timer0Min = value.timer0Max = timer0;
        value.gxstat = 6;
        value.vframe = 5;
        value.year = 2000;
        value.month = 1;
        value.day = 1;
        value.seconds = 59;
        value.minSecondOffset = -59;
        value.maxSecondOffset = 59;
        return value;
    }

    bool check(bool condition, const char *message)
    {
        if (!condition) std::cerr << message << '\n';
        return condition;
    }

    std::array<std::uint32_t, 6> unpackIVs(std::uint32_t packed)
    {
        std::array<std::uint32_t, 6> ivs = {};
        for (std::uint32_t index = 0; index < ivs.size(); index++) ivs[index] = (packed >> (index * 5)) & 31;
        return ivs;
    }

    const Gen5AdjacentSeedsPackedResult *findSeed(std::uint64_t seed)
    {
        const auto *rows = reinterpret_cast<const Gen5AdjacentSeedsPackedResult *>(gen5adjacentseeds_result_ptr());
        for (std::uint32_t index = 0; index < gen5adjacentseeds_result_count(); index++)
        {
            const auto current = (static_cast<std::uint64_t>(rows[index].seedHigh) << 32) | rows[index].seedLow;
            if (current == seed) return &rows[index];
        }
        return nullptr;
    }

    bool checkFixture(Gen5AdjacentSeedsPackedRequest value, std::uint64_t seed,
                      const std::array<std::uint32_t, 6> &expectedIVs,
                      const std::array<std::uint8_t, 4> &expectedNeedles, bool unovaLink = false)
    {
        if (!check(gen5adjacentseeds_generate(&value) == 60, "fixture returned the wrong row count")) return false;
        if (!check(gen5adjacentseeds_processed_count() == 119, "fixture returned the wrong processed count")) return false;
        const auto *row = findSeed(seed);
        if (!check(row != nullptr, "fixture seed was not generated")) return false;
        if (!check(unpackIVs(row->ivs) == expectedIVs, "fixture IVs did not match upstream")) return false;
        std::array<std::uint8_t, 25> needles = {};
        if (!check(gen5adjacentseeds_preview(row->seedLow, row->seedHigh, row->pidAdvanceTarget & 0x7fffffffU, 0,
                                             needles.data(), needles.size()) == needles.size(),
                   "needle preview returned the wrong count")) return false;
        for (std::uint32_t index = 0; index < expectedNeedles.size(); index++)
        {
            const std::uint32_t previewIndex = unovaLink ? index * 2 : index;
            if (needles[previewIndex] != expectedNeedles[index])
            {
                std::cerr << "needle preview mismatch at " << previewIndex << ": expected "
                          << static_cast<std::uint32_t>(expectedNeedles[index]) << ", got "
                          << static_cast<std::uint32_t>(needles[previewIndex]) << '\n';
                return false;
            }
        }
        std::array<std::uint8_t, 25> chatot = {};
        if (!check(gen5adjacentseeds_preview(row->seedLow, row->seedHigh, row->pidAdvanceTarget & 0x7fffffffU, 1,
                                             chatot.data(), chatot.size()) == chatot.size(),
                   "Chatot preview returned the wrong count")) return false;
        for (auto pitch : chatot)
            if (!check(pitch <= 99, "Chatot preview returned an invalid pitch")) return false;
        return true;
    }
}

int main()
{
    if (!check(gen5adjacentseeds_api_version() == 1, "unexpected API version")) return 1;

    constexpr std::uint64_t blackSeed = 6812116909077463616ULL;
    if (!checkFixture(request(0, 46, 1544), blackSeed, { 24, 4, 18, 5, 26, 0 }, { 5, 4, 0, 5 })) return 1;

    constexpr std::uint64_t black2Seed = 5264333967543063602ULL;
    auto black2 = request(2, 72, 2418);
    black2.memoryLink = 1;
    if (!checkFixture(black2, black2Seed, { 5, 4, 27, 10, 7, 17 }, { 0, 1, 0, 7 }, true)) return 1;

    auto wrap = request(0, 46, 1544);
    wrap.year = 2099;
    wrap.month = 12;
    wrap.day = 31;
    wrap.hour = 23;
    wrap.minute = 59;
    wrap.second = 59;
    wrap.seconds = 1;
    wrap.minSecondOffset = wrap.maxSecondOffset = 1;
    if (!check(gen5adjacentseeds_generate(&wrap) == 1, "upper date wrap returned the wrong count")) return 1;
    const auto *wrapped = reinterpret_cast<const Gen5AdjacentSeedsPackedResult *>(gen5adjacentseeds_result_ptr());
    if (!check(wrapped[0].date == (2000U | (1U << 16) | (1U << 24)) && wrapped[0].time == 0,
               "upper date did not wrap to the DS minimum")) return 1;

    auto maximumAdvance = request(0, 46, 1544);
    maximumAdvance.seconds = 0;
    maximumAdvance.minSecondOffset = maximumAdvance.maxSecondOffset = 0;
    maximumAdvance.initialIVAdvance = 0xffffffffU;
    if (!check(gen5adjacentseeds_generate(&maximumAdvance) == 1,
               "maximum IV advance did not terminate with one row")) return 1;
    const auto *maximumRow
        = reinterpret_cast<const Gen5AdjacentSeedsPackedResult *>(gen5adjacentseeds_result_ptr());
    if (!check(maximumRow[0].ivAdvance == 0xffffffffU, "maximum IV advance was not preserved")) return 1;

    auto invalid = request(2, 72, 2418);
    invalid.initialIVAdvance = 0xffffffffU;
    if (!check(gen5adjacentseeds_generate(&invalid) == 0, "advance overflow unexpectedly generated rows")) return 1;
    if (!check(gen5adjacentseeds_last_error() == 1, "advance overflow returned the wrong error")) return 1;
    return 0;
}
