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
    constexpr std::uint32_t apiVersion = 2;
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

    enum ShinyFilter : std::uint32_t
    {
        ShinyAny = 0,
        ShinyStar = 1,
        ShinySquare = 2,
        ShinyStarSquare = 3,
    };

    enum GenderFilter : std::uint32_t
    {
        GenderAny = 0,
        GenderMale = 1,
        GenderFemale = 2,
    };

    enum AbilityFilter : std::uint32_t
    {
        AbilityAny = 0,
        AbilityFirst = 1,
        AbilitySecond = 2,
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

    bool matchesShiny(std::uint8_t value, std::uint32_t filter)
    {
        return filter == ShinyAny || (filter & value) != 0;
    }

    bool matchesGender(std::uint8_t value, std::uint32_t filter)
    {
        return filter == GenderAny || (filter == GenderMale && value == 0)
            || (filter == GenderFemale && value == 1);
    }

    bool matchesAbility(std::uint8_t value, std::uint32_t filter)
    {
        return filter == AbilityAny || (filter == AbilityFirst && value == 0)
            || (filter == AbilitySecond && value == 1);
    }

    std::uint8_t hiddenPowerType(const std::array<std::uint8_t, 6> &ivs)
    {
        return static_cast<std::uint8_t>(
            ((ivs[0] & 1) + 2 * (ivs[1] & 1) + 4 * (ivs[2] & 1) + 8 * (ivs[5] & 1)
             + 16 * (ivs[3] & 1) + 32 * (ivs[4] & 1))
            * 15 / 63);
    }

    bool matchesIvs(const std::array<std::uint8_t, 6> &ivs, const std::array<std::uint32_t, 6> &minimum,
                    const std::array<std::uint32_t, 6> &maximum)
    {
        for (std::size_t index = 0; index < ivs.size(); index++)
        {
            if (ivs[index] < minimum[index] || ivs[index] > maximum[index])
            {
                return false;
            }
        }
        return true;
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
        std::uint32_t sid, std::uint32_t shinyFilter, std::uint32_t genderFilter,
        std::uint32_t abilityFilter, std::uint32_t natureMask, std::uint32_t hiddenPowerMask,
        std::uint32_t encounterSlotMask, std::uint32_t levelMin, std::uint32_t levelMax,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
        std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin,
        std::uint32_t hpMax, std::uint32_t attackMax, std::uint32_t defenseMax,
        std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (slots == nullptr || slotCount == 0 || slotCount > 12 || maxAdvances >= maxStatesPerCall
            || !validMethod(method) || !validLead(lead) || !validEncounter(encounter) || rate == 0 || rate > 255
            || rse > 1 || feebasTile > 1 || feebasLocation > 1 || safariZone > 1 || bike > 1
            || item > 3 || tid > 0xffff || sid > 0xffff || shinyFilter > ShinyStarSquare
            || genderFilter > GenderFemale || abilityFilter > AbilitySecond || natureMask == 0
            || natureMask > 0x1ffffff || hiddenPowerMask == 0 || hiddenPowerMask > 0xffff
            || encounterSlotMask == 0 || encounterSlotMask > 0xfff || levelMin == 0 || levelMax > 100
            || levelMin > levelMax)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::array<std::uint32_t, 6> ivMinimum
            = { hpMin, attackMin, defenseMin, specialAttackMin, specialDefenseMin, speedMin };
        const std::array<std::uint32_t, 6> ivMaximum
            = { hpMax, attackMax, defenseMax, specialAttackMax, specialDefenseMax, speedMax };
        for (std::size_t index = 0; index < ivMinimum.size(); index++)
        {
            if (ivMinimum[index] > 31 || ivMaximum[index] > 31 || ivMinimum[index] > ivMaximum[index])
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
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
                || slot.minLevel > slot.maxLevel || slot.maxLevel > 100 || slot.genderRatio > 255
                || (slot.types & 0xff) > 16 || ((slot.types >> 8) & 0xff) > 16 || (slot.types >> 16) != 0)
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
            if ((encounterSlotMask & (1u << selectedSlot)) == 0)
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
            if (level < levelMin || level > levelMax)
            {
                continue;
            }

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
            const auto abilityValue = static_cast<std::uint8_t>(pid & 1);
            const auto genderValue = gender(pid, slot.genderRatio);
            const auto shinyValue = shiny(pid, trainerXor);
            if (!matchesShiny(shinyValue, shinyFilter) || !matchesGender(genderValue, genderFilter)
                || !matchesAbility(abilityValue, abilityFilter)
                || (hiddenPowerMask & (1u << hiddenPowerType(ivs))) == 0
                || !matchesIvs(ivs, ivMinimum, ivMaximum))
            {
                continue;
            }
            const std::uint32_t natureShiny
                = nature | (static_cast<std::uint32_t>(shinyValue) << 8);
            results.push_back({ initialAdvances + count, pid, ivs[0], ivs[1], ivs[2], ivs[3], ivs[4], ivs[5],
                                abilityValue, genderValue, level, natureShiny, selectedSlot,
                                slot.species, slot.form });
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
