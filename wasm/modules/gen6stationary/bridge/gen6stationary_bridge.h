/*
 * PokeRNGKit Gen VI Stationary WebAssembly bridge.
 * Adapted from 3DSRNGTool Stationary6, StationaryRNG and MersenneTwister.
 * 3DSRNGTool is MIT licensed; this bridge is GPL-3.0-or-later.
 */
#ifndef POKERNGKIT_GEN6STATIONARY_BRIDGE_H
#define POKERNGKIT_GEN6STATIONARY_BRIDGE_H
#include <cstdint>
extern "C" {
std::uint32_t gen6stationary_api_version();
std::uint32_t gen6stationary_generate(const std::uint32_t *request);
std::uintptr_t gen6stationary_result_ptr();
std::uint32_t gen6stationary_result_count();
std::uint32_t gen6stationary_processed_count();
std::uint32_t gen6stationary_limit_reached();
std::uint32_t gen6stationary_last_error();
}
#endif
