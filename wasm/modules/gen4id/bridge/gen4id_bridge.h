/*
 * PokeRNGKit Gen IV ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN4ID_BRIDGE_H
#define POKERNGKIT_GEN4ID_BRIDGE_H

#include <cstdint>

struct Gen4IdPackedState
{
    std::uint32_t seed;
    std::uint32_t delay;
    std::uint32_t tid;
    std::uint32_t sid;
    std::uint32_t tsv;
    std::uint32_t seconds;
};

extern "C"
{
    std::uint32_t gen4id_api_version();
    std::uint32_t gen4id_generate(std::uint32_t second, std::uint32_t minDelay,
                                  std::uint32_t maxDelay, std::uint32_t year,
                                  std::uint32_t month, std::uint32_t day, std::uint32_t hour,
                                  std::uint32_t minute, std::uint32_t filterMode,
                                  const std::uint32_t *filterValues, std::uint32_t filterCount);
    std::uint32_t gen4id_search(std::uint32_t minDelay, std::uint32_t maxDelay,
                                std::uint32_t year,
                                std::uint32_t filterMode, const std::uint32_t *filterValues,
                                std::uint32_t filterCount);
    std::uintptr_t gen4id_result_ptr();
    std::uint32_t gen4id_result_count();
    std::uint32_t gen4id_last_error();
}

#endif
