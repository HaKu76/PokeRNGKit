/*
 * PokeRNGKit Gen III Wild WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3wild_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <array>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 3;
    constexpr std::uint32_t maxStatesPerCall = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    enum Encounter : std::uint32_t
    {
        Grass = 0,
        RockSmash = 3,
        Surfing = 4,
        OldRod = 6,
        GoodRod = 7,
        SuperRod = 8,
    };

    enum Lead : std::uint32_t
    {
        SynchronizeEnd = 24,
        CuteCharmF = 25,
        CuteCharmM = 26,
        MagnetPull = 27,
        Static = 28,
        Pressure = 32,
        LeadNone = 255,
    };

    thread_local std::vector<Gen3WildPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool validMethod(std::uint32_t method)
    {
        return method == 1 || method == 2 || method == 4;
    }

    bool validEncounter(std::uint32_t encounter)
    {
        return encounter == Grass || encounter == RockSmash || encounter == Surfing || encounter == OldRod
            || encounter == GoodRod || encounter == SuperRod;
    }

    bool validLead(std::uint32_t lead)
    {
        return lead <= SynchronizeEnd || lead == CuteCharmF || lead == CuteCharmM || lead == MagnetPull
            || lead == Static || lead == Pressure || lead == LeadNone;
    }

    std::uint8_t encounterSlot(std::uint32_t encounter, std::uint32_t value)
    {
        constexpr std::array<std::uint8_t, 12> grassRanges = { 20, 40, 50, 60, 70, 80, 85, 90, 94, 98, 99, 100 };
        constexpr std::array<std::uint8_t, 5> surfRanges = { 60, 90, 95, 99, 100 };
        constexpr std::array<std::uint8_t, 2> oldRodRanges = { 70, 100 };
        constexpr std::array<std::uint8_t, 3> goodRodRanges = { 60, 80, 100 };
        constexpr std::array<std::uint8_t, 5> superRodRanges = { 40, 80, 95, 99, 100 };

        const auto find = [value](const auto &ranges) {
            for (std::uint8_t index = 0; index < ranges.size(); index++)
            {
                if (value < ranges[index])
                {
                    return index;
                }
            }
            return static_cast<std::uint8_t>(ranges.size() - 1);
        };
        if (encounter == OldRod)
        {
            return find(oldRodRanges);
        }
        if (encounter == GoodRod)
        {
            return find(goodRodRanges);
        }
        if (encounter == SuperRod)
        {
            return find(superRodRanges);
        }
        if (encounter == Surfing || encounter == RockSmash)
        {
            return find(surfRanges);
        }
        return find(grassRanges);
    }

    std::uint8_t gender(std::uint32_t pid, std::uint32_t ratio)
    {
        if (ratio == 255)
        {
            return 2;
        }
        if (ratio == 254)
        {
            return 1;
        }
        if (ratio == 0)
        {
            return 0;
        }
        return (pid & 0xff) < ratio ? 1 : 0;
    }

    std::uint8_t shiny(std::uint32_t pid, std::uint16_t trainerXor)
    {
        const std::uint16_t pidXor = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffff));
        if (trainerXor == pidXor)
        {
            return 2;
        }
        return (trainerXor ^ pidXor) < 8 ? 1 : 0;
    }

    bool fixedGender(std::uint32_t ratio)
    {
        return ratio == 0 || ratio == 254 || ratio == 255;
    }

    bool matchesFilters(const std::array<std::uint8_t, 6> &ivs, std::uint32_t pid, std::uint8_t resultGender,
                        std::uint8_t resultShiny, std::uint8_t slotIndex, const Gen3WildPackedSlot &slot,
                        std::uint32_t level, std::uint32_t shinyFilter, std::uint32_t genderFilter,
                        std::uint32_t abilityFilter, std::uint32_t speciesFilter, std::uint32_t slotMask,
                        std::uint32_t levelMin, std::uint32_t levelMax, const std::array<std::uint32_t, 6> &ivMin,
                        const std::array<std::uint32_t, 6> &ivMax)
    {
        if ((shinyFilter != 0 && (shinyFilter & resultShiny) == 0)
            || (genderFilter != 0 && resultGender != genderFilter - 1)
            || (abilityFilter != 0 && (pid & 1) != abilityFilter - 1)
            || (speciesFilter != 0 && slot.species != speciesFilter) || (slotMask & (1u << slotIndex)) == 0
            || level < levelMin || level > levelMax)
        {
            return false;
        }
        for (std::size_t index = 0; index < ivs.size(); index++)
        {
            if (ivs[index] < ivMin[index] || ivs[index] > ivMax[index]) return false;
        }
        return true;
    }

    struct RecoverySeeds
    {
        std::uint32_t count = 0;
        std::array<std::uint32_t, 6> seeds {};
    };

    RecoverySeeds recoverMethod12(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::uint32_t add = 0x6073;
        constexpr std::uint32_t mult = 0x41c64e6d;
        constexpr std::uint32_t mod = 0x67d3;
        constexpr std::uint32_t pat = 0xd3e;
        constexpr std::uint32_t inc = 0x4034;
        const std::uint32_t first = (ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16;
        const std::uint32_t second = (ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16;
        const std::uint16_t difference = static_cast<std::uint16_t>((second - first * mult) >> 16);
        const std::array<std::uint16_t, 2> starts = {
            static_cast<std::uint16_t>((((difference * mod + inc) >> 16) * pat) % mod),
            static_cast<std::uint16_t>(((((difference ^ 0x8000) * mod + inc) >> 16) * pat) % mod),
        };
        RecoverySeeds recovered;
        for (const std::uint16_t start : starts)
        {
            for (std::uint32_t low = start; low < 0x10000; low += mod)
            {
                const std::uint32_t seed = first | low;
                if (((seed * mult + add) & 0x7fff0000) == second)
                {
                    recovered.seeds[recovered.count++] = seed;
                    recovered.seeds[recovered.count++] = seed ^ 0x80000000;
                }
            }
        }
        return recovered;
    }

    RecoverySeeds recoverMethod4(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::uint32_t add = 0xe97e7b6a;
        constexpr std::uint32_t mult = 0xc2a29a69;
        constexpr std::uint32_t mod = 0x3a89;
        constexpr std::uint32_t pat = 0x2e4c;
        constexpr std::uint32_t inc = 0x5831;
        const std::uint32_t first = (ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16;
        const std::uint32_t second = (ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16;
        const std::uint16_t difference = static_cast<std::uint16_t>((second - (first * mult + add)) >> 16);
        const std::array<std::uint16_t, 2> starts = {
            static_cast<std::uint16_t>((((difference * mod + inc) >> 16) * pat) % mod),
            static_cast<std::uint16_t>(((((difference ^ 0x8000) * mod + inc) >> 16) * pat) % mod),
        };
        RecoverySeeds recovered;
        for (const std::uint16_t start : starts)
        {
            for (std::uint32_t low = start; low < 0x10000; low += mod)
            {
                const std::uint32_t seed = first | low;
                if (((seed * mult + add) & 0x7fff0000) == second)
                {
                    recovered.seeds[recovered.count++] = seed;
                    recovered.seeds[recovered.count++] = seed ^ 0x80000000;
                }
            }
        }
        return recovered;
    }

    std::array<std::uint8_t, 6> ivsAtIndex(std::uint64_t index, const std::array<std::uint32_t, 6> &minimum,
                                           const std::array<std::uint32_t, 6> &maximum)
    {
        std::array<std::uint8_t, 6> ivs {};
        for (int stat = 5; stat >= 0; stat--)
        {
            const std::uint32_t width = maximum[stat] - minimum[stat] + 1;
            ivs[stat] = static_cast<std::uint8_t>(minimum[stat] + index % width);
            index /= width;
        }
        return ivs;
    }
}

static_assert(sizeof(Gen3WildPackedSlot) == 24);
static_assert(sizeof(Gen3WildPackedState) == 60);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3wild_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3wild_generate(
        const Gen3WildPackedSlot *slots, std::uint32_t slotCount, std::uint32_t seed,
        std::uint32_t initialAdvances, std::uint32_t maxAdvances, std::uint32_t offset,
        std::uint32_t method, std::uint32_t lead, std::uint32_t encounter, std::uint32_t rate,
        std::uint32_t rse, std::uint32_t feebasTile, std::uint32_t feebasLocation,
        std::uint32_t safariZone, std::uint32_t bike, std::uint32_t item, std::uint32_t tid,
        std::uint32_t sid, std::uint32_t natureMask)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (slots == nullptr || slotCount == 0 || slotCount > 12 || maxAdvances >= maxStatesPerCall
            || !validMethod(method) || !validLead(lead) || !validEncounter(encounter) || rate == 0 || rate > 255
            || item > 3 || tid > 0xffff || sid > 0xffff || natureMask == 0 || natureMask > 0x1ffffff)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (static_cast<std::uint64_t>(initialAdvances) + offset + maxAdvances > 0xffffffffULL)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        for (std::uint32_t index = 0; index < slotCount; index++)
        {
            const auto &slot = slots[index];
            if (slot.species == 0 || slot.species > 1025 || slot.form > 255 || slot.minLevel == 0
                || slot.minLevel > slot.maxLevel || slot.maxLevel > 100 || slot.genderRatio > 255)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
        }

        std::array<std::uint8_t, 12> modifiedSlots {};
        std::uint32_t modifiedCount = 0;
        const std::uint32_t modifiedType = lead == MagnetPull ? 8 : lead == Static ? 12 : 255;
        if (modifiedType != 255)
        {
            for (std::uint32_t index = 0; index < slotCount; index++)
            {
                const std::uint32_t types = slots[index].types;
                if ((types & 0xff) == modifiedType || ((types >> 8) & 0xff) == modifiedType)
                {
                    modifiedSlots[modifiedCount++] = static_cast<std::uint8_t>(index);
                }
            }
            if (modifiedCount == slotCount)
            {
                modifiedCount = 0;
            }
        }

        const bool rock = rse != 0 && encounter == RockSmash;
        std::uint32_t encounterRate = rate * 16;
        if (rock)
        {
            if (bike != 0)
            {
                encounterRate = encounterRate * 80 / 100;
            }
            if (item == 1)
            {
                encounterRate /= 2;
            }
            else if (item == 2)
            {
                encounterRate = encounterRate * 2 / 3;
            }
            else if (item == 3)
            {
                encounterRate += encounterRate / 2;
            }
        }
        const bool feebas = feebasTile != 0 && feebasLocation != 0;
        const std::uint16_t trainerXor = static_cast<std::uint16_t>(tid ^ sid);

        PokeRNG rng(seed, initialAdvances + offset);
        results.reserve(maxAdvances + 1);
        for (std::uint32_t count = 0; count <= maxAdvances; count++, rng.next())
        {
            PokeRNG generated(rng);
            if (rock && generated.nextUShort(2880) >= encounterRate)
            {
                continue;
            }

            std::uint8_t selectedSlot;
            if (feebas && generated.nextUShort(100) < 50)
            {
                selectedSlot = encounter == OldRod ? 2 : encounter == GoodRod ? 3 : 5;
            }
            else if ((lead == MagnetPull || lead == Static) && generated.nextUShort(2) == 0
                     && modifiedCount != 0)
            {
                selectedSlot = modifiedSlots[generated.nextUShort(modifiedCount)];
            }
            else
            {
                selectedSlot = encounterSlot(encounter, generated.nextUShort(100));
            }
            if (selectedSlot >= slotCount)
            {
                continue;
            }

            const auto &slot = slots[selectedSlot];
            const std::uint32_t levelRange = slot.maxLevel - slot.minLevel + 1;
            std::uint32_t levelRoll = generated.nextUShort(levelRange);
            if (lead == Pressure && generated.nextUShort(2) == 0)
            {
                levelRoll = slot.maxLevel - slot.minLevel;
            }
            else if (lead == Pressure && levelRoll != 0)
            {
                levelRoll--;
            }
            const std::uint32_t level = slot.minLevel + levelRoll;

            bool cuteCharm = false;
            if ((lead == CuteCharmF || lead == CuteCharmM) && !fixedGender(slot.genderRatio))
            {
                cuteCharm = generated.nextUShort(3) != 0;
            }
            if (safariZone != 0)
            {
                generated.next();
            }

            const std::uint32_t nature = lead <= SynchronizeEnd
                ? (generated.nextUShort(2) == 0 ? lead : generated.nextUShort(25))
                : generated.nextUShort(25);
            if ((natureMask & (1u << nature)) == 0)
            {
                continue;
            }

            std::uint32_t pid;
            do
            {
                const std::uint16_t low = generated.nextUShort();
                const std::uint16_t high = generated.nextUShort();
                pid = (static_cast<std::uint32_t>(high) << 16) | low;
            } while (pid % 25 != nature
                     || (cuteCharm && ((lead == CuteCharmF && (pid & 0xff) < slot.genderRatio)
                                       || (lead == CuteCharmM && (pid & 0xff) >= slot.genderRatio))));

            if (method == 2)
            {
                generated.next();
            }
            const std::uint16_t first = generated.nextUShort();
            if (method == 4)
            {
                generated.next();
            }
            const std::uint16_t second = generated.nextUShort();
            const std::array<std::uint8_t, 6> ivs = {
                static_cast<std::uint8_t>(first & 31), static_cast<std::uint8_t>((first >> 5) & 31),
                static_cast<std::uint8_t>((first >> 10) & 31), static_cast<std::uint8_t>((second >> 5) & 31),
                static_cast<std::uint8_t>((second >> 10) & 31), static_cast<std::uint8_t>(second & 31),
            };
            const std::uint32_t natureShiny = nature | (static_cast<std::uint32_t>(shiny(pid, trainerXor)) << 8);
            results.push_back({ initialAdvances + count, pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5],
                                pid & 1, gender(pid, slot.genderRatio), level, natureShiny, selectedSlot,
                                slot.species, slot.form });
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3wild_search(
        const Gen3WildPackedSlot *slots, std::uint32_t slotCount, std::uint32_t startIndex,
        std::uint32_t stateCount, std::uint32_t method, std::uint32_t lead, std::uint32_t encounter,
        std::uint32_t rate, std::uint32_t rse, std::uint32_t feebasTile, std::uint32_t feebasLocation,
        std::uint32_t safariZone, std::uint32_t tid, std::uint32_t sid, std::uint32_t natureMask,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
        std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin,
        std::uint32_t hpMax, std::uint32_t attackMax, std::uint32_t defenseMax,
        std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax)
    {
        results.clear();
        lastError = ErrorCode::None;
        const std::array<std::uint32_t, 6> minimum = { hpMin, attackMin, defenseMin, specialAttackMin,
                                                        specialDefenseMin, speedMin };
        const std::array<std::uint32_t, 6> maximum = { hpMax, attackMax, defenseMax, specialAttackMax,
                                                        specialDefenseMax, speedMax };
        std::uint64_t total = 1;
        if (slots == nullptr || slotCount == 0 || slotCount > 12 || stateCount == 0 || stateCount > maxStatesPerCall
            || !validMethod(method) || !validLead(lead) || !validEncounter(encounter) || rate == 0 || rate > 255
            || tid > 0xffff || sid > 0xffff || natureMask == 0 || natureMask > 0x1ffffff)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        for (std::size_t index = 0; index < minimum.size(); index++)
        {
            if (minimum[index] > 31 || maximum[index] > 31 || minimum[index] > maximum[index])
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            total *= maximum[index] - minimum[index] + 1;
        }
        if (static_cast<std::uint64_t>(startIndex) + stateCount > total)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        std::array<std::uint8_t, 12> modifiedSlots {};
        std::uint32_t modifiedCount = 0;
        const std::uint32_t modifiedType = lead == MagnetPull ? 8 : lead == Static ? 12 : 255;
        if (modifiedType != 255)
        {
            for (std::uint32_t index = 0; index < slotCount; index++)
            {
                const auto types = slots[index].types;
                if ((types & 0xff) == modifiedType || ((types >> 8) & 0xff) == modifiedType)
                {
                    modifiedSlots[modifiedCount++] = static_cast<std::uint8_t>(index);
                }
            }
            if (modifiedCount == slotCount)
            {
                modifiedCount = 0;
            }
        }
        const bool safari = safariZone != 0;
        const bool feebas = feebasTile != 0 && feebasLocation != 0;
        const bool rock = rse != 0 && encounter == RockSmash;
        const std::uint32_t rockRate = rate * 16;
        const std::uint16_t trainerXor = static_cast<std::uint16_t>(tid ^ sid);
        results.reserve(static_cast<std::size_t>(stateCount) * 2);

        const auto emit = [&](PokeRNGR state, std::uint32_t pid, const std::array<std::uint8_t, 6> &ivs,
                              std::uint8_t slotIndex, std::uint16_t levelRand, bool force) {
            if (slotIndex >= slotCount)
            {
                return;
            }
            if (rock && state.nextUShort(2880) >= rockRate)
            {
                return;
            }
            const auto &slot = slots[slotIndex];
            const std::uint32_t span = slot.maxLevel - slot.minLevel + 1;
            std::uint32_t level = slot.minLevel + levelRand % span;
            if (force)
            {
                level = slot.maxLevel;
            }
            const auto nature = static_cast<std::uint8_t>(pid % 25);
            results.push_back({ state.next(), pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5], pid & 1,
                                gender(pid, slot.genderRatio), level,
                                static_cast<std::uint32_t>(nature)
                                    | (static_cast<std::uint32_t>(shiny(pid, trainerXor)) << 8),
                                slotIndex, slot.species, slot.form });
        };

        for (std::uint32_t offset = 0; offset < stateCount; offset++)
        {
            const auto ivs = ivsAtIndex(static_cast<std::uint64_t>(startIndex) + offset, minimum, maximum);
            const auto recovered = method == 4 ? recoverMethod4(ivs) : recoverMethod12(ivs);
            for (std::uint32_t index = 0; index < recovered.count; index++)
            {
                PokeRNGR rng(recovered.seeds[index]);
                if (method == 2)
                {
                    rng.next();
                }
                std::uint32_t pid = static_cast<std::uint32_t>(rng.nextUShort()) << 16;
                pid |= rng.nextUShort();
                const auto nature = static_cast<std::uint8_t>(pid % 25);
                if ((natureMask & (1u << nature)) == 0)
                {
                    continue;
                }
                std::uint16_t nextRNG = rng.nextUShort();
                std::uint16_t nextRNG2 = rng.nextUShort();
                for (;;)
                {
                    PokeRNGR test(rng);
                    if (lead == LeadNone && nextRNG % 25 == nature)
                    {
                        if (safari) test.next();
                        const auto levelRand = safari ? test.nextUShort() : nextRNG2;
                        const auto slotIndex = feebas && test.nextUShort(100) < 50
                            ? static_cast<std::uint8_t>(encounter == OldRod ? 2 : encounter == GoodRod ? 3 : 5)
                            : encounterSlot(encounter, test.nextUShort(100));
                        emit(test, pid, ivs, slotIndex, levelRand, false);
                    }
                    else if ((lead == MagnetPull || lead == Static) && nextRNG % 25 == nature)
                    {
                        if (safari) test.next();
                        const auto levelRand = safari ? test.nextUShort() : nextRNG2;
                        const auto roll = test.nextUShort();
                        const auto slotIndex = test.nextUShort(2) == 0 && modifiedCount != 0
                            ? modifiedSlots[roll % modifiedCount]
                            : encounterSlot(encounter, roll % 100);
                        emit(test, pid, ivs, slotIndex, levelRand, false);
                    }
                    else if (lead == Pressure && nextRNG % 25 == nature)
                    {
                        if (safari) test.next();
                        const bool force = ((safari ? test.nextUShort() : nextRNG2) & 1) == 0;
                        const auto levelRand = test.nextUShort();
                        emit(test, pid, ivs, encounterSlot(encounter, test.nextUShort(100)), levelRand, force);
                    }
                    else if ((lead == CuteCharmF || lead == CuteCharmM) && nextRNG % 25 == nature)
                    {
                        const bool charm = nextRNG2 % 3 != 0;
                        if (safari) test.next();
                        const auto levelRand = test.nextUShort();
                        const auto slotIndex = encounterSlot(encounter, test.nextUShort(100));
                        if (slotIndex < slotCount && (!charm || !fixedGender(slots[slotIndex].genderRatio))
                            && (!charm || (lead == CuteCharmF ? (pid & 0xff) >= slots[slotIndex].genderRatio
                                                              : (pid & 0xff) < slots[slotIndex].genderRatio)))
                        {
                            emit(test, pid, ivs, slotIndex, levelRand, false);
                        }
                    }
                    // Synchronize has two upstream branches. The branch matching a forced nature is emitted here;
                    // the ordinary branch is covered by the following nature hunt iteration.
                    else if (lead <= SynchronizeEnd && (nextRNG & 1) == 0)
                    {
                        if (safari) test.next();
                        const auto levelRand = safari ? test.nextUShort() : nextRNG2;
                        emit(test, pid, ivs, encounterSlot(encounter, test.nextUShort(100)), levelRand, false);
                    }
                    const auto huntNature = static_cast<std::uint32_t>((static_cast<std::uint32_t>(nextRNG) << 16) | nextRNG2) % 25;
                    if (huntNature == nature)
                    {
                        break;
                    }
                    nextRNG = rng.nextUShort();
                    nextRNG2 = rng.nextUShort();
                }
            }
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3wild_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3wild_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3wild_last_error()
    {
        return lastError;
    }
}
