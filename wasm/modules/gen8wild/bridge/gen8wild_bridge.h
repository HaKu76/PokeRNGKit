/*
 * PokeRNGKit Gen VIII Wild WebAssembly bridge.
 * Derived from PokeFinder 4.3.2 WildGenerator8.
 * GPL-3.0-or-later.
 */
#ifndef POKERNGKIT_GEN8WILD_BRIDGE_H
#define POKERNGKIT_GEN8WILD_BRIDGE_H

#include <cstdint>

#if defined(__EMSCRIPTEN__)
#include <emscripten/emscripten.h>
#define POKERNGKIT_GEN8WILD_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_GEN8WILD_KEEPALIVE
#endif

extern "C"
{
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_api_version();
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_generate(const std::uint32_t *request);
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uintptr_t gen8wild_result_ptr();
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_result_count();
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_processed_count();
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_limit_reached();
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_last_error();
}

#endif
