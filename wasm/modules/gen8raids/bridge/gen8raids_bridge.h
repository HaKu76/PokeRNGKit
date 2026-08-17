/*
 * PokeRNGKit Gen VIII Raids bridge.
 * Derived from PokeFinder 4.3.2 RaidGenerator.
 * Copyright (C) 2017-2024 Admiral_Fish, bumba, and EzPzStreamz.
 * GPL-3.0-or-later.
 */
#ifndef POKERNGKIT_GEN8RAIDS_BRIDGE_H
#define POKERNGKIT_GEN8RAIDS_BRIDGE_H

#include <cstdint>

#if defined(__EMSCRIPTEN__)
#define POKERNGKIT_GEN8RAIDS_KEEPALIVE __attribute__((used))
#else
#define POKERNGKIT_GEN8RAIDS_KEEPALIVE
#endif

extern "C"
{
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_api_version();
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_generate(const std::uint32_t *request);
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uintptr_t gen8raids_result_ptr();
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_result_count();
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_processed_count();
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_limit_reached();
    POKERNGKIT_GEN8RAIDS_KEEPALIVE std::uint32_t gen8raids_last_error();
}

#endif
