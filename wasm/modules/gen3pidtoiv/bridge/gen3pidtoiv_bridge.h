/*
 * PokeRNGKit Gen III PID to IVs WebAssembly bridge.
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#ifndef POKERNGKIT_GEN3_PIDTOIV_BRIDGE_H
#define POKERNGKIT_GEN3_PIDTOIV_BRIDGE_H

#include <cstdint>

struct Gen3PidToIvPackedState
{
    std::uint32_t seed;
    std::uint32_t method;
    std::uint32_t hp;
    std::uint32_t atk;
    std::uint32_t def;
    std::uint32_t spa;
    std::uint32_t spd;
    std::uint32_t spe;
};

extern "C"
{
    std::uint32_t gen3pidtoiv_api_version();
    std::uint32_t gen3pidtoiv_calculate(std::uint32_t pid);
    std::uintptr_t gen3pidtoiv_result_ptr();
    std::uint32_t gen3pidtoiv_result_count();
    std::uint32_t gen3pidtoiv_last_error();
}

#endif
