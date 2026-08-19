/*
 * PokeRNGKit Gen VI TinyFinder MT Seed WebAssembly bridge.
 * Adapted from TinyFinder Subforms/MT, RNG/MT.cs and FastHordes.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

extern "C" {
std::uint32_t gen6mtseed_api_version();
std::uint32_t gen6mtseed_begin(const std::uint32_t *request);
std::uint32_t gen6mtseed_step(std::uint32_t maximum_states);
std::uintptr_t gen6mtseed_result_ptr();
std::uint32_t gen6mtseed_result_count();
std::uint32_t gen6mtseed_step_processed();
std::uint32_t gen6mtseed_total_processed();
std::uint32_t gen6mtseed_done();
std::uint32_t gen6mtseed_limit_reached();
std::uint32_t gen6mtseed_last_error();
}
