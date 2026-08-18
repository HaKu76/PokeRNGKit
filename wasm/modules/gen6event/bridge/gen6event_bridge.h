/*
 * PokeRNGKit Gen VI Event WebAssembly bridge.
 * Adapted from 3DSRNGTool Event6 and EventRNG.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

extern "C" {
std::uint32_t gen6event_api_version();
std::uint32_t gen6event_generate(const std::uint32_t *request);
std::uintptr_t gen6event_result_ptr();
std::uint32_t gen6event_result_count();
std::uint32_t gen6event_processed_count();
std::uint32_t gen6event_limit_reached();
std::uint32_t gen6event_last_error();
}
