/*
 * This file is part of PokeRNGKit.
 * Derived from PokeFinder 4.3.2 Core/Gen8/Generators/RaidGenerator.cpp.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz.
 * GPL-3.0-or-later.
 */
#include "gen8raids_bridge.h"

#include <array>
#include <algorithm>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <vector>

namespace
{
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maximumEvaluations = 250000000;
    constexpr std::uint64_t frameIncrement = 0x82A2B175229D6A5BULL;
    constexpr std::uint8_t toxtricityAmpedNatures[] = { 3, 4, 2, 8, 9, 19, 22, 11, 13, 14, 0, 6, 24 };
    constexpr std::uint8_t toxtricityLowKeyNatures[] = { 1, 5, 7, 10, 12, 15, 16, 17, 18, 20, 21, 23 };

    struct Gen8RaidTemplate
    {
        std::uint16_t species;
        std::uint8_t form;
        std::uint8_t shiny;
        std::uint8_t ability;
        std::uint8_t gender;
        std::uint8_t ivCount;
        std::uint8_t gigantamax;
        std::uint8_t starMask;
        std::uint8_t level;
    };
    struct Gen8RaidDen
    {
        std::uint64_t hash;
        std::array<Gen8RaidTemplate, 12> sword;
        std::array<Gen8RaidTemplate, 12> shield;
    };
    struct Gen8RaidEvent
    {
        std::array<Gen8RaidTemplate, 30> sword;
        std::array<Gen8RaidTemplate, 30> shield;
    };
    struct Gen8DenInfo
    {
        std::uint64_t normalHash;
        std::uint64_t rareHash;
        std::uint8_t location;
        std::uint16_t x;
        std::uint16_t y;
    };
    struct Gen8RaidPersonal
    {
        std::array<std::uint8_t, 6> stats;
        std::uint8_t gender;
        std::uint8_t formCount;
        std::uint16_t formStatIndex;
        std::array<std::uint16_t, 3> abilities;
    };

#include "raid_data.inc"

    struct Xoroshiro
    {
        std::uint64_t s0;
        std::uint64_t s1;
        std::uint64_t next()
        {
            const std::uint64_t result = s0 + s1;
            s1 ^= s0;
            s0 = std::rotl(s0, 24) ^ s1 ^ (s1 << 16);
            s1 = std::rotl(s1, 37);
            return result;
        }
        std::uint32_t bounded(std::uint64_t maximum)
        {
            const std::uint64_t mask = std::bit_ceil(maximum) - 1;
            std::uint64_t value;
            do
            {
                value = next() & mask;
            } while (value >= maximum);
            return static_cast<std::uint32_t>(value);
        }
    };

    struct Gen8RaidPackedResult
    {
        std::uint32_t advances;
        std::uint32_t ec;
        std::uint32_t pid;
        std::uint32_t metadata;
        std::uint32_t measures;
        std::uint32_t ivs0;
        std::uint32_t ivs1;
        std::uint32_t abilityIndex;
        std::uint32_t stats01;
        std::uint32_t stats23;
        std::uint32_t stats45;
        std::uint32_t templateInfo;
    };

    std::vector<Gen8RaidPackedResult> results;
    std::uint32_t processedCount = 0;
    bool limitReached = false;
    std::uint32_t lastError = 0;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    std::uint32_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ pid);
        if (tsv == psv) return 2;
        return (tsv ^ psv) < 16 ? 1 : 0;
    }
    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ pid);
        return (tsv ^ psv) < 16;
    }
    std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint32_t bits = 0;
        for (std::uint32_t index = 0; index < order.size(); index++) bits |= (ivs[order[index]] & 1U) << index;
        return static_cast<std::uint8_t>((bits * 15) / 63);
    }
    std::uint8_t characteristic(std::uint32_t ec, const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        const std::uint8_t start = static_cast<std::uint8_t>(ec % 6);
        std::uint8_t selected = start;
        std::uint8_t maximum = 0;
        for (std::uint8_t offset = 0; offset < 6; offset++)
        {
            const std::uint8_t index = static_cast<std::uint8_t>((start + offset) % 6);
            if (ivs[order[index]] > maximum)
            {
                selected = index;
                maximum = ivs[order[index]];
            }
        }
        return static_cast<std::uint8_t>(selected * 5 + maximum % 5);
    }
    const Gen8RaidPersonal &personal(std::uint16_t species, std::uint8_t form)
    {
        const auto &base = GEN8_RAID_PERSONAL[species];
        if (form == 0 || base.formStatIndex == 0) return base;
        const auto index = static_cast<std::size_t>(base.formStatIndex + form - 1);
        return index < GEN8_RAID_PERSONAL.size() ? GEN8_RAID_PERSONAL[index] : base;
    }
    std::array<std::uint16_t, 6> stats(const Gen8RaidPersonal &info, const std::array<std::uint8_t, 6> &ivs, std::uint8_t nature, std::uint8_t level)
    {
        constexpr std::array<std::uint8_t, 5> natureMap = { 1, 2, 5, 3, 4 };
        const std::uint8_t raised = natureMap[nature / 5];
        const std::uint8_t lowered = natureMap[nature % 5];
        std::array<std::uint16_t, 6> values = {};
        for (std::size_t index = 0; index < 6; index++)
        {
            const std::uint32_t scaled = ((2U * info.stats[index] + ivs[index]) * level) / 100;
            if (index == 0)
            {
                values[index] = static_cast<std::uint16_t>(scaled + level + 10);
                continue;
            }
            const std::uint32_t raw = scaled + 5;
            values[index] = static_cast<std::uint16_t>(raised == lowered ? raw : index == raised ? raw * 11 / 10 : index == lowered ? raw * 9 / 10 : raw);
        }
        return values;
    }
    bool passesFilter(const std::uint32_t *request, std::uint8_t shiny, std::uint8_t ability, std::uint8_t gender, std::uint8_t nature,
                      std::uint8_t height, std::uint8_t weight, const std::array<std::uint8_t, 6> &ivs)
    {
        if (request[16] != 0) return true;
        const std::uint32_t shinyMask = request[17];
        if (shinyMask != 255 && (shinyMask & (1U << shiny)) == 0) return false;
        if (request[18] != 255 && request[18] != gender) return false;
        if (request[19] != 255 && request[19] != ability) return false;
        if ((request[20] & (1U << nature)) == 0 || request[22] > height || request[23] < height || request[24] > weight || request[25] < weight) return false;
        if ((request[21] & (1U << hiddenPower(ivs))) == 0) return false;
        for (std::size_t index = 0; index < 6; index++)
            if (ivs[index] < request[26 + index] || ivs[index] > request[32 + index]) return false;
        if (std::count_if(ivs.begin(), ivs.end(), [&](std::uint8_t iv) { return iv >= request[38]; }) < request[39]) return false;
        return true;
    }
    bool validRequest(const std::uint32_t *request)
    {
        const std::uint64_t seed = (static_cast<std::uint64_t>(request[1]) << 32) | request[0];
        if (seed == 0 || request[5] == 0 || request[5] > maximumEvaluations || request[8] == 0 || request[8] > 898 || request[9] > 31 || request[10] > 2 || request[11] > 4 || request[12] > 3 || request[13] < 1 || request[13] > 6 || request[14] < 1 || request[14] > 100 || request[15] > 255 || request[16] > 1 || request[17] == 0 || request[20] == 0 || request[21] == 0 || request[22] > request[23] || request[24] > request[25] || request[38] > 31 || request[39] > 6 || request[40] == 0 || request[40] > 100000 || request[41] > 31 || request[42] > 1)
            return false;
        if (static_cast<std::uint64_t>(request[2]) + request[3] + request[4] + request[5] > std::numeric_limits<std::uint32_t>::max() + 1ULL) return false;
        for (std::size_t index = 0; index < 6; index++) if (request[26 + index] > 31 || request[32 + index] > 31 || request[26 + index] > request[32 + index]) return false;
        return true;
    }
    Gen8RaidPackedResult pack(std::uint32_t advances, std::uint32_t ec, std::uint32_t pid, std::uint8_t shiny, std::uint8_t nature, std::uint8_t ability, std::uint8_t gender,
                              const std::array<std::uint8_t, 6> &ivs, const std::array<std::uint16_t, 6> &statValues, std::uint8_t height, std::uint8_t weight,
                              std::uint32_t abilityIndex, const std::uint32_t *request)
    {
        const std::uint32_t metadata = ability | (static_cast<std::uint32_t>(gender) << 2) | (static_cast<std::uint32_t>(nature) << 4) | (static_cast<std::uint32_t>(shiny) << 9) | (static_cast<std::uint32_t>(characteristic(ec, ivs)) << 11);
        const std::uint32_t measures = height | (static_cast<std::uint32_t>(weight) << 8);
        const std::uint32_t templateInfo = request[8] | (request[9] << 10) | (request[41] << 16) | (request[42] << 24);
        const std::uint32_t ivs0 = ivs[0] | (static_cast<std::uint32_t>(ivs[1]) << 8) | (static_cast<std::uint32_t>(ivs[2]) << 16) | (static_cast<std::uint32_t>(ivs[3]) << 24);
        const std::uint32_t ivs1 = ivs[4] | (static_cast<std::uint32_t>(ivs[5]) << 8);
        const std::uint32_t stats01 = statValues[0] | (static_cast<std::uint32_t>(statValues[1]) << 16);
        const std::uint32_t stats23 = statValues[2] | (static_cast<std::uint32_t>(statValues[3]) << 16);
        const std::uint32_t stats45 = statValues[4] | (static_cast<std::uint32_t>(statValues[5]) << 16);
        return { advances, ec, pid, metadata, measures, ivs0, ivs1, abilityIndex, stats01, stats23, stats45, templateInfo };
    }
    void generate(const std::uint32_t *request)
    {
        const std::uint64_t seed = (static_cast<std::uint64_t>(request[1]) << 32) | request[0];
        std::uint64_t currentSeed = seed + frameIncrement * (static_cast<std::uint64_t>(request[2]) + request[3] + request[4]);
        const auto &info = personal(static_cast<std::uint16_t>(request[8]), static_cast<std::uint8_t>(request[9]));
        results.clear();
        results.reserve(std::min(request[40], request[5]));
        processedCount = 0;
        limitReached = false;
        for (std::uint32_t count = 0; count < request[5]; count++, currentSeed += frameIncrement)
        {
            Xoroshiro rng { currentSeed, frameIncrement };
            const std::uint32_t ec = rng.bounded(0xffffffffULL);
            const std::uint32_t sidtid = rng.bounded(0xffffffffULL);
            std::uint32_t pid = rng.bounded(0xffffffffULL);
            const std::uint16_t tsv = static_cast<std::uint16_t>(request[6] ^ request[7]);
            std::uint8_t shiny = 0;
            if (request[10] == 0)
            {
                shiny = shinyValue(pid, static_cast<std::uint16_t>((sidtid >> 16) ^ sidtid));
                if (shiny)
                {
                    if (shinyValue(pid, tsv) != shiny)
                    {
                        const std::uint16_t high = static_cast<std::uint16_t>(pid) ^ tsv ^ (2 - shiny);
                        pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(pid);
                    }
                }
                else if (isShiny(pid, tsv)) pid ^= 0x10000000U;
            }
            else if (request[10] == 1)
            {
                shiny = 0;
                if (isShiny(pid, tsv)) pid ^= 0x10000000U;
            }
            else
            {
                shiny = 2;
                if (shinyValue(pid, tsv) != 2)
                {
                    const std::uint16_t high = static_cast<std::uint16_t>(pid) ^ tsv;
                    pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(pid);
                }
            }
            std::array<std::uint8_t, 6> ivs = { 255, 255, 255, 255, 255, 255 };
            for (std::uint8_t perfect = 0; perfect < request[13];)
            {
                const std::uint8_t index = static_cast<std::uint8_t>(rng.bounded(6));
                if (ivs[index] == 255) { ivs[index] = 31; perfect++; }
            }
            for (auto &iv : ivs) if (iv == 255) iv = static_cast<std::uint8_t>(rng.bounded(32));
            const std::uint8_t ability = request[11] == 4 ? static_cast<std::uint8_t>(rng.bounded(3)) : request[11] == 3 ? static_cast<std::uint8_t>(rng.bounded(2)) : static_cast<std::uint8_t>(request[11]);
            std::uint8_t gender;
            if (request[12] == 0)
            {
                if (request[15] == 255) gender = 2;
                else if (request[15] == 254) gender = 1;
                else if (request[15] == 0) gender = 0;
                else gender = static_cast<std::uint8_t>((rng.bounded(253) + 1) < request[15]);
            }
            else gender = static_cast<std::uint8_t>(request[12] - 1);
            std::uint8_t nature;
            if (request[8] != 849) nature = static_cast<std::uint8_t>(rng.bounded(25));
            else if (request[9] == 0) nature = toxtricityAmpedNatures[rng.bounded(13)];
            else nature = toxtricityLowKeyNatures[rng.bounded(12)];
            const std::uint8_t height = static_cast<std::uint8_t>(rng.bounded(129) + rng.bounded(128));
            const std::uint8_t weight = static_cast<std::uint8_t>(rng.bounded(129) + rng.bounded(128));
            processedCount++;
            if (passesFilter(request, shiny, ability, gender, nature, height, weight, ivs))
            {
                results.emplace_back(pack(request[2] + request[4] + count, ec, pid, shiny, nature, ability, gender, ivs, stats(info, ivs, nature, static_cast<std::uint8_t>(request[14])), height, weight, info.abilities[ability], request));
                if (results.size() >= request[40]) { limitReached = processedCount < request[5]; break; }
            }
        }
    }
}

extern "C"
{
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_api_version() { return apiVersion; }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_generate(const std::uint32_t *request)
    {
        results.clear(); processedCount = 0; limitReached = false; lastError = None;
        if (request == nullptr || !validRequest(request)) { lastError = InvalidInput; return 0; }
        if (request[4] >= maximumEvaluations || request[5] > maximumEvaluations - request[4]) { lastError = RangeTooLarge; return 0; }
        generate(request);
        return static_cast<std::uint32_t>(results.size());
    }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uintptr_t gen8raids_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_processed_count() { return processedCount; }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_limit_reached() { return limitReached ? 1U : 0U; }
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_last_error() { return lastError; }
}
