#pragma once

#include <cstdint>

struct Gen7EggSeedFinderResult {
    std::uint32_t state0;
    std::uint32_t state1;
    std::uint32_t state2;
    std::uint32_t state3;
};

extern "C" {
std::uint32_t gen7eggseedfinder_api_version();
std::uint32_t gen7eggseedfinder_search(std::uint32_t startSeed,
                                       std::uint32_t endSeed,
                                       const std::uint32_t *natureList,
                                       std::uint32_t shinyCharm);
const Gen7EggSeedFinderResult *gen7eggseedfinder_result_ptr();
std::uint32_t gen7eggseedfinder_result_count();
std::uint32_t gen7eggseedfinder_magikarp(const std::uint8_t *bits,
                                         std::uint32_t length);
const std::uint32_t *gen7eggseedfinder_magikarp_result_ptr();
std::uint32_t gen7eggseedfinder_last_error();
}
