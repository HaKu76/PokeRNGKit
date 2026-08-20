/* PokeRNGKit Gen VI TinyFinder MT Seed Time Finder bridge. */
#pragma once
#include <cstdint>
extern "C" {
std::uint32_t gen6mtseedtime_api_version();
std::uint32_t gen6mtseedtime_begin(const std::uint32_t *request);
std::uint32_t gen6mtseedtime_step(std::uint32_t maximum_states);
std::uintptr_t gen6mtseedtime_result_ptr();
std::uint32_t gen6mtseedtime_result_count();
std::uint32_t gen6mtseedtime_step_processed();
std::uint32_t gen6mtseedtime_total_processed();
std::uint32_t gen6mtseedtime_done();
std::uint32_t gen6mtseedtime_limit_reached();
std::uint32_t gen6mtseedtime_last_error();
}
