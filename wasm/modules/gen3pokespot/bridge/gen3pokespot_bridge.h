/*
 * PokeRNGKit Gen III PokeSpot WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GEN3POKESPOT_BRIDGE_H
#define POKERNGKIT_GEN3POKESPOT_BRIDGE_H

#include <cstddef>
#include <cstdint>

struct Gen3PokeSpotPackedState
{
    std::uint32_t foodAdvances;
    std::uint32_t encounterAdvances;
    std::uint32_t pid;
    std::uint32_t species;
    std::uint32_t slot;
    std::uint32_t hp;
    std::uint32_t attack;
    std::uint32_t defense;
    std::uint32_t specialAttack;
    std::uint32_t specialDefense;
    std::uint32_t speed;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t level;
    std::uint32_t nature;
    std::uint32_t shiny;
};

extern "C"
{
    std::uint32_t gen3pokespot_api_version();
    std::uint32_t gen3pokespot_generate(
        std::uint32_t foodSeed, std::uint32_t encounterSeed, std::uint32_t foodInitialAdvances,
        std::uint32_t foodMaxAdvances, std::uint32_t encounterInitialAdvances,
        std::uint32_t encounterMaxAdvances, std::uint32_t foodOffset, std::uint32_t encounterOffset,
        std::uint32_t location, std::uint32_t tid, std::uint32_t sid, std::uint32_t shinyFilter,
        std::uint32_t genderFilter, std::uint32_t abilityFilter, std::uint32_t natureFilter,
        std::uint32_t hiddenPowerFilter, std::uint32_t encounterSlotFilter,
        std::uint32_t hpMin, std::uint32_t attackMin, std::uint32_t defenseMin,
        std::uint32_t specialAttackMin, std::uint32_t specialDefenseMin, std::uint32_t speedMin,
        std::uint32_t hpMax, std::uint32_t attackMax, std::uint32_t defenseMax,
        std::uint32_t specialAttackMax, std::uint32_t specialDefenseMax, std::uint32_t speedMax);
    std::uintptr_t gen3pokespot_result_ptr();
    std::uint32_t gen3pokespot_result_count();
    std::uint32_t gen3pokespot_last_error();
}

#endif
