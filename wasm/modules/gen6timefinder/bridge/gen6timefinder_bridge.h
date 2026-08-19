/* PokeRNGKit Gen VI Time Finder bridge. GPL-3.0-or-later. */
#pragma once
#include <cstdint>
extern "C" {
std::uint32_t gen6timefinder_api_version();
std::uint32_t gen6timefinder_initial_seed(std::uint32_t saveVariable, std::uint32_t timeVariable,
                                           std::uint32_t epochLow, std::uint32_t epochHigh);
}
