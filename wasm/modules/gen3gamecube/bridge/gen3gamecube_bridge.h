/*
 * PokeRNGKit Gen III GameCube WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GEN3GAMECUBE_BRIDGE_H
#define POKERNGKIT_GEN3GAMECUBE_BRIDGE_H

#include <cstdint>

struct Gen3GameCubePackedState
{
    std::uint32_t advancesOrSeed;
    std::uint32_t pid;
    std::uint32_t hp;
    std::uint32_t attack;
    std::uint32_t defense;
    std::uint32_t specialAttack;
    std::uint32_t specialDefense;
    std::uint32_t speed;
    std::uint32_t ability;
    std::uint32_t gender;
    std::uint32_t level;
    std::uint32_t natureShiny;
};

extern "C"
{
    std::uint32_t gen3gamecube_api_version();
    std::uint32_t gen3gamecube_generate(const std::uint32_t *request, std::uint32_t wordCount);
    std::uint32_t gen3gamecube_search(const std::uint32_t *request, std::uint32_t wordCount);
    std::uintptr_t gen3gamecube_result_ptr();
    std::uint32_t gen3gamecube_result_count();
    std::uint32_t gen3gamecube_last_error();
}

#endif
