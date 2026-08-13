/*
 * PokeRNGKit Pokerus Finder bridge.
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from DevonStudios Pokerus Finder under GNU GPL-3.0.
 */
#ifndef POKERNGKIT_POKERUSFINDER_BRIDGE_H
#define POKERNGKIT_POKERUSFINDER_BRIDGE_H

#include <cstdint>

extern "C"
{
    std::uint32_t pokerusfinder_api_version();
    std::uint32_t pokerusfinder_search_gen3(std::uint32_t seed, std::uint32_t frame, std::uint32_t delay, std::uint32_t maxFrames);
    std::uint32_t pokerusfinder_search_pthgss(std::uint32_t year, std::uint32_t month, std::uint32_t day, std::uint32_t hour, std::uint32_t minute);
    std::uintptr_t pokerusfinder_result_ptr();
    std::uint32_t pokerusfinder_result_count();
    std::uint32_t pokerusfinder_last_error();
}

#endif
