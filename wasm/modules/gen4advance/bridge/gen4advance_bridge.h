/*
 * PokeRNGKit Gen IV Advance Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#ifndef POKERNGKIT_GEN4ADVANCE_BRIDGE_H
#define POKERNGKIT_GEN4ADVANCE_BRIDGE_H

#include <cstdint>

struct Gen4AdvancePackedRow
{
    std::uint32_t advances;
    std::uint32_t value;
};

struct Gen4AdvancePackedMatch
{
    std::uint32_t row;
    std::uint32_t advances;
};

extern "C"
{
    std::uint32_t gen4advance_api_version();
    std::uint32_t gen4advance_search(std::uint32_t mode, const Gen4AdvancePackedRow *rows,
                                     std::uint32_t rowCount, const std::uint32_t *tokens,
                                     std::uint32_t tokenCount);
    std::uintptr_t gen4advance_result_ptr();
    std::uint32_t gen4advance_result_count();
    std::uint32_t gen4advance_last_error();
}

#endif
