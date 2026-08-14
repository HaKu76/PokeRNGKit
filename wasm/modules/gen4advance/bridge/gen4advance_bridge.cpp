/*
 * PokeRNGKit Gen IV Advance Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 AdvanceSearcher by
 * Admiral_Fish, bumba, and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen4advance_bridge.h"

#include <cstdint>
#include <utility>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t maximumRows = 1000000;
    constexpr std::uint32_t maximumTokens = 100000;

    enum class Mode : std::uint32_t
    {
        Calls = 0,
        Chatot = 1,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        TooManyRows = 2,
        TooManyTokens = 3,
    };

    thread_local std::vector<Gen4AdvancePackedMatch> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    bool tokenRange(Mode mode, std::uint32_t token, std::uint32_t &minimum, std::uint32_t &maximum)
    {
        if (mode == Mode::Calls)
        {
            if (token > 2) return false;
            minimum = token;
            maximum = token + 1;
            return true;
        }

        switch (token)
        {
        case 0: minimum = 0; maximum = 100; return true;
        case 1: minimum = 80; maximum = 100; return true;
        case 2: minimum = 60; maximum = 80; return true;
        case 3: minimum = 40; maximum = 60; return true;
        case 4: minimum = 20; maximum = 40; return true;
        case 5: minimum = 0; maximum = 20; return true;
        case 6: minimum = 60; maximum = 100; return true;
        case 7: minimum = 40; maximum = 80; return true;
        case 8: minimum = 20; maximum = 60; return true;
        case 9: minimum = 0; maximum = 40; return true;
        default: return false;
        }
    }
}

static_assert(sizeof(Gen4AdvancePackedRow) == 2 * sizeof(std::uint32_t));
static_assert(sizeof(Gen4AdvancePackedMatch) == 2 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen4advance_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4advance_search(
        std::uint32_t modeValue, const Gen4AdvancePackedRow *rows, std::uint32_t rowCount,
        const std::uint32_t *tokens, std::uint32_t tokenCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (modeValue > static_cast<std::uint32_t>(Mode::Chatot)
            || (rowCount != 0 && rows == nullptr) || (tokenCount != 0 && tokens == nullptr))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (rowCount > maximumRows)
        {
            lastError = ErrorCode::TooManyRows;
            return 0;
        }
        if (tokenCount > maximumTokens)
        {
            lastError = ErrorCode::TooManyTokens;
            return 0;
        }

        const auto mode = static_cast<Mode>(modeValue);
        const auto valueMaximum = mode == Mode::Calls ? 2U : 99U;
        for (std::uint32_t index = 0; index < rowCount; index++)
        {
            if (rows[index].value > valueMaximum)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
        }

        std::vector<std::pair<std::uint32_t, std::uint32_t>> sequence;
        sequence.reserve(tokenCount);
        for (std::uint32_t index = 0; index < tokenCount; index++)
        {
            std::uint32_t minimum;
            std::uint32_t maximum;
            if (!tokenRange(mode, tokens[index], minimum, maximum))
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            sequence.emplace_back(minimum, maximum);
        }

        if (sequence.empty()) return 0;
        for (std::uint32_t row = 0; row + sequence.size() <= rowCount; row++)
        {
            bool match = true;
            for (std::uint32_t offset = 0; offset < sequence.size() && match; offset++)
            {
                const auto value = rows[row + offset].value;
                match = value >= sequence[offset].first && value < sequence[offset].second;
            }
            if (match) results.push_back({ row, rows[row].advances });
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen4advance_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4advance_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen4advance_last_error() { return lastError; }
}
