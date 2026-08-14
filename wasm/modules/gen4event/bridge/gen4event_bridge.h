/*
 * PokeRNGKit Gen IV Event WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_EVENT4_BRIDGE_H
#define POKERNGKIT_EVENT4_BRIDGE_H

#include <cstdint>

struct Gen4EventPackedState
{
    std::uint32_t advances, hp, attack, defense, specialAttack, specialDefense, speed;
    std::uint32_t hiddenPower, hiddenPowerStrength, call, chatot;
};

struct Gen4EventPackedSearcherState
{
    std::uint32_t seed, delay, hour, advances, hp, attack, defense, specialAttack, specialDefense, speed;
    std::uint32_t hiddenPower, hiddenPowerStrength;
};

extern "C"
{
    std::uint32_t gen4event_api_version();
    std::uint32_t gen4event_generate(
        std::uint32_t seed, std::uint32_t initialAdvances, std::uint32_t maxAdvances,
        std::uint32_t offset, std::uint32_t species, std::uint32_t nature,
        std::uint32_t level, std::uint32_t hiddenPowerFilter, std::uint32_t hpMin,
        std::uint32_t attackMin, std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
        std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax, std::uint32_t speedMax);
    std::uint32_t gen4event_search(
        std::uint32_t startIndex, std::uint32_t stateCount, std::uint32_t minAdvance,
        std::uint32_t maxAdvance, std::uint32_t minDelay, std::uint32_t maxDelay,
        std::uint32_t species, std::uint32_t nature, std::uint32_t level,
        std::uint32_t hiddenPowerFilter, std::uint32_t hpMin, std::uint32_t attackMin,
        std::uint32_t defenseMin, std::uint32_t specialAttackMin,
        std::uint32_t specialDefenseMin, std::uint32_t speedMin, std::uint32_t hpMax,
        std::uint32_t attackMax, std::uint32_t defenseMax, std::uint32_t specialAttackMax,
        std::uint32_t specialDefenseMax, std::uint32_t speedMax);
    std::uintptr_t gen4event_result_ptr();
    std::uint32_t gen4event_result_count();
    std::uint32_t gen4event_last_error();
}

#endif
