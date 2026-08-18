/*
 * PokeRNGKit Gen VI Pokemon Link / Transporter WebAssembly bridge.
 * The Bank workflow shares the verified Stationary6 ABI and RNG core.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#pragma once

#include <cstdint>

extern "C" {
std::uint32_t gen6bank_api_version();
std::uint32_t gen6bank_generate(const std::uint32_t *request);
std::uintptr_t gen6bank_result_ptr();
std::uint32_t gen6bank_result_count();
std::uint32_t gen6bank_processed_count();
std::uint32_t gen6bank_limit_reached();
std::uint32_t gen6bank_last_error();
}
