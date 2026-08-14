/*
 * PokeRNGKit Gen IV Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN4EGG_BRIDGE_H
#define POKERNGKIT_GEN4EGG_BRIDGE_H

#include <cstdint>

struct Gen4EggPackedState
{
    std::uint32_t advances;
    std::uint32_t pickupAdvances;
    std::uint32_t pid;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t nature;
    std::uint32_t shiny;
    std::uint32_t hp;
    std::uint32_t attack;
    std::uint32_t defense;
    std::uint32_t specialAttack;
    std::uint32_t specialDefense;
    std::uint32_t speed;
    std::uint32_t inheritanceHp;
    std::uint32_t inheritanceAttack;
    std::uint32_t inheritanceDefense;
    std::uint32_t inheritanceSpecialAttack;
    std::uint32_t inheritanceSpecialDefense;
    std::uint32_t inheritanceSpeed;
    std::uint32_t hiddenPower;
    std::uint32_t hiddenPowerStrength;
    std::uint32_t call;
    std::uint32_t chatot;
};

struct Gen4EggPackedSearcherState
{
    std::uint32_t seed;
    std::uint32_t delay;
    Gen4EggPackedState state;
};

extern "C"
{
    std::uint32_t gen4egg_api_version();
    std::uint32_t gen4egg_generate(const std::uint32_t *request, std::uint32_t requestWords,
                                   std::uint32_t initialAdvancesHeld, std::uint32_t maxAdvancesHeld);
    std::uint32_t gen4egg_search(const std::uint32_t *request, std::uint32_t requestWords,
                                 std::uint32_t startIndex, std::uint32_t stateCount);
    std::uintptr_t gen4egg_result_ptr();
    std::uint32_t gen4egg_result_count();
    std::uint32_t gen4egg_last_error();
}

#endif
