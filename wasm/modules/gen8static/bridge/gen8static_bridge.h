/*
 * PokeRNGKit Gen VIII Static bridge.
 * Derived from PokeFinder 4.3.2 StaticGenerator8.
 * Copyright (C) 2017-2024 Admiral_Fish, bumba, and EzPzStreamz.
 * GPL-3.0-or-later.
 */
#ifndef POKERNGKIT_GEN8STATIC_BRIDGE_H
#define POKERNGKIT_GEN8STATIC_BRIDGE_H

#include <cstdint>

#if defined(__EMSCRIPTEN__)
#define POKERNGKIT_GEN8STATIC_KEEPALIVE __attribute__((used))
#else
#define POKERNGKIT_GEN8STATIC_KEEPALIVE
#endif

extern "C"
{
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_api_version();
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_generate(const std::uint32_t *request);
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uintptr_t gen8static_result_ptr();
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_result_count();
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_processed_count();
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_limit_reached();
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_last_error();
}

#endif
