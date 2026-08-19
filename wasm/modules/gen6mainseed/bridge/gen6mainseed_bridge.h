/*
 * PokeRNGKit Gen VI Main Seed Finder WebAssembly bridge.
 * Adapted from 3DSRNGTool Gen6MTSeedFinder and MersenneTwister_Fast.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

extern "C" {
std::uint32_t gen6mainseed_api_version();
std::uint32_t gen6mainseed_search(const std::uint32_t *request);
std::uintptr_t gen6mainseed_result_ptr();
std::uint32_t gen6mainseed_result_count();
std::uint32_t gen6mainseed_processed_count();
std::uint32_t gen6mainseed_last_error();
}
