/* PokeRNGKit Gen VI TinyFinder Honey Wild bridge. GPL-3.0-or-later. */
#pragma once

#include <cstdint>

struct gen6tinyhoneyResult
{
    std::uint32_t words[24];
};

extern "C"
{
    std::uint32_t gen6tinyhoney_api_version();
    std::uint32_t gen6tinyhoney_begin(const std::uint32_t *request);
    std::uint32_t gen6tinyhoney_step(std::uint32_t maximumStates);
    std::uintptr_t gen6tinyhoney_result_ptr();
    std::uint32_t gen6tinyhoney_result_count();
    std::uint32_t gen6tinyhoney_step_processed();
    std::uint32_t gen6tinyhoney_total_processed();
    std::uint32_t gen6tinyhoney_done();
    std::uint32_t gen6tinyhoney_limit_reached();
    std::uint32_t gen6tinyhoney_last_error();
}
