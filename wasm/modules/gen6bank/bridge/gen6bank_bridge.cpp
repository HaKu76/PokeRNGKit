/*
 * PokeRNGKit Gen VI Pokemon Link / Transporter WebAssembly bridge.
 * The Bank workflow shares the verified Stationary6 ABI and RNG core.
 * Copyright (C) 2026 Hakuhiro. GPL-3.0-or-later.
 */
#include "gen6bank_bridge.h"

#include "../../gen6stationary/bridge/gen6stationary_bridge.cpp"

namespace {
constexpr std::size_t bankIndex = 13;
}

extern "C" {
std::uint32_t gen6bank_api_version() {
    return gen6stationary_api_version();
}

std::uint32_t gen6bank_generate(const std::uint32_t *request) {
    if (request == nullptr || request[bankIndex] != 1) {
        return gen6stationary_generate(nullptr);
    }
    return gen6stationary_generate(request);
}

std::uintptr_t gen6bank_result_ptr() {
    return gen6stationary_result_ptr();
}

std::uint32_t gen6bank_result_count() {
    return gen6stationary_result_count();
}

std::uint32_t gen6bank_processed_count() {
    return gen6stationary_processed_count();
}

std::uint32_t gen6bank_limit_reached() {
    return gen6stationary_limit_reached();
}

std::uint32_t gen6bank_last_error() {
    return gen6stationary_last_error();
}
}
