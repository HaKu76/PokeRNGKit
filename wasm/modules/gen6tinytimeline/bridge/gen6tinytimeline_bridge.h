#pragma once

#include <cstdint>

struct Gen6TinyTimelineResult {
    std::uint32_t words[16];
};

extern "C" {
std::uint32_t gen6tinytimeline_api_version();
std::uint32_t gen6tinytimeline_generate(const std::uint32_t *request);
std::uintptr_t gen6tinytimeline_result_ptr();
std::uint32_t gen6tinytimeline_result_count();
std::uint32_t gen6tinytimeline_processed_count();
std::uint32_t gen6tinytimeline_limit_reached();
std::uint32_t gen6tinytimeline_last_error();
}
