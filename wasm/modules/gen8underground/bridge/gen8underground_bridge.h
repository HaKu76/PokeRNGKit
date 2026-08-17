/*
 * PokeRNGKit Gen VIII Underground WebAssembly bridge.
 * Derived from PokeFinder 4.3.2. GPL-3.0-or-later.
 */
#ifndef POKERNGKIT_GEN8UNDERGROUND_BRIDGE_H
#define POKERNGKIT_GEN8UNDERGROUND_BRIDGE_H

#include <cstdint>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE
#endif

extern "C"
{
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_api_version();
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_generate(const std::uint32_t *request);
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uintptr_t gen8underground_result_ptr();
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_result_count();
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_processed_count();
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_limit_reached();
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_last_error();
}

#endif
