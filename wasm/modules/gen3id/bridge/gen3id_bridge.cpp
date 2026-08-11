/*
 * PokeRNGKit Gen III ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3id_bridge.h"

#include <Core/Gen3/Generators/IDGenerator3.hpp>
#include <Core/Parents/States/IDState.hpp>
#include <Core/RNG/LCRNG.hpp>
#include <array>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maxStatesPerCall = 100000;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidMode = 1,
        InvalidInput = 2,
        RangeTooLarge = 3,
    };

    thread_local std::vector<Id3PackedState> results;
    thread_local std::vector<Id3PackedSearchState> searchResults;
    thread_local std::uint32_t lastError = ErrorCode::None;

    std::vector<u16> makeFilter(std::uint32_t flags, std::uint32_t flag, std::uint32_t value)
    {
        if ((flags & flag) == 0)
        {
            return { };
        }

        return { static_cast<u16>(value) };
    }

    void pack(const std::vector<IDState> &states)
    {
        results.clear();
        results.reserve(states.size());

        for (const auto &state : states)
        {
            results.push_back({ state.getAdvances(),
                                static_cast<std::uint32_t>(state.getTID())
                                    | (static_cast<std::uint32_t>(state.getSID()) << 16),
                                state.getTSV() });
        }
    }

    struct SeedDateTime
    {
        std::uint16_t year;
        std::uint8_t month;
        std::uint8_t day;
        std::uint8_t hour;
        std::uint8_t minute;
        bool valid;
    };

    const std::array<SeedDateTime, 0x10000> &seedDateTimes()
    {
        static const auto dates = [] {
            std::array<SeedDateTime, 0x10000> values { };
            constexpr std::array<std::uint8_t, 12> daysInMonth = { 31, 29, 31, 30, 31, 30,
                                                                  31, 31, 30, 31, 30, 31 };
            std::uint32_t dayOfYear = 0;
            for (std::uint8_t month = 1; month <= 12; month++)
            {
                for (std::uint8_t day = 1; day <= daysInMonth[month - 1]; day++, dayOfYear++)
                {
                    for (std::uint8_t hour = 0; hour < 24; hour++)
                    {
                        for (std::uint8_t minute = 0; minute < 60; minute++)
                        {
                            std::uint32_t value = 1440 * dayOfYear + 960 * (hour / 10)
                                + 60 * (hour % 10) + 16 * (minute / 10) + (minute % 10) + 0x5a0;
                            const auto seed = static_cast<std::uint16_t>((value >> 16) ^ (value & 0xffff));
                            if (!values[seed].valid)
                            {
                                values[seed] = { 2000, month, day, hour, minute, true };
                            }
                        }
                    }
                }
            }
            return values;
        }();
        return dates;
    }

    void recover(std::uint16_t tid, std::uint16_t sid, std::uint32_t shinyXor, bool includeShiny)
    {
        const auto &dates = seedDateTimes();
        for (std::uint32_t low = 0; low <= 0xffff; low++)
        {
            const std::uint32_t sidState = (static_cast<std::uint32_t>(sid) << 16) | low;
            PokeRNG forward(sidState);
            if (forward.nextUShort() != tid)
            {
                continue;
            }

            PokeRNGR reverse(sidState);
            std::uint32_t seed = reverse.next();
            std::uint32_t frame = 0;
            while (seed > 0xffff)
            {
                seed = reverse.next();
                frame++;
            }

            const auto &date = dates[seed];
            if (!date.valid)
            {
                continue;
            }

            const std::uint32_t idXor = tid ^ sid;
            const std::uint32_t shiny = !includeShiny ? 0 : (idXor == shinyXor ? 2 : 1);
            searchResults.push_back({ seed, frame, static_cast<std::uint32_t>(tid) | (static_cast<std::uint32_t>(sid) << 16),
                                      (idXor >> 3) | (shiny << 16),
                                      static_cast<std::uint32_t>(date.year) | (static_cast<std::uint32_t>(date.month) << 16)
                                          | (static_cast<std::uint32_t>(date.day) << 24),
                                      static_cast<std::uint32_t>(date.hour) | (static_cast<std::uint32_t>(date.minute) << 8) });
        }
    }
}

static_assert(sizeof(Id3PackedState) == 12);
static_assert(sizeof(Id3PackedSearchState) == 24);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_generate(std::uint32_t mode, std::uint32_t input,
                                                   std::uint32_t initialAdvances, std::uint32_t maxAdvances,
                                                   std::uint32_t filterFlags, std::uint32_t tid,
                                                   std::uint32_t sid, std::uint32_t tsv)
    {
        results.clear();
        searchResults.clear();
        lastError = ErrorCode::None;

        if (maxAdvances >= maxStatesPerCall)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }

        if (((filterFlags & Id3FilterFlag::FilterTID) != 0 && tid > 0xffff)
            || ((filterFlags & Id3FilterFlag::FilterSID) != 0 && sid > 0xffff)
            || ((filterFlags & Id3FilterFlag::FilterTSV) != 0 && tsv > 0x1fff))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        IDFilter filter(makeFilter(filterFlags, Id3FilterFlag::FilterTID, tid),
                        makeFilter(filterFlags, Id3FilterFlag::FilterSID, sid), { },
                        makeFilter(filterFlags, Id3FilterFlag::FilterTSV, tsv), { }, { });
        IDGenerator3 generator(initialAdvances, maxAdvances, filter);

        switch (static_cast<Id3Mode>(mode))
        {
        case Id3Mode::XDColo:
            pack(generator.generateXDColo(input));
            break;
        case Id3Mode::FRLGE:
            if (input > 0xffff)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            pack(generator.generateFRLGE(static_cast<u16>(input)));
            break;
        case Id3Mode::RS:
            if (input > 0xffff)
            {
                lastError = ErrorCode::InvalidInput;
                return 0;
            }
            pack(generator.generateRS(static_cast<u16>(input)));
            break;
        default:
            lastError = ErrorCode::InvalidMode;
            return 0;
        }

        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_search(std::uint32_t mode, std::uint32_t tid, std::uint32_t input)
    {
        results.clear();
        searchResults.clear();
        lastError = ErrorCode::None;

        if (tid > 0xffff || (mode == static_cast<std::uint32_t>(Id3SearchMode::SID) && input > 0xffff))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }

        if (mode == static_cast<std::uint32_t>(Id3SearchMode::SID))
        {
            recover(static_cast<std::uint16_t>(tid), static_cast<std::uint16_t>(input), 0, false);
        }
        else if (mode == static_cast<std::uint32_t>(Id3SearchMode::PID))
        {
            const std::uint32_t shinyXor = (input >> 16) ^ (input & 0xffff);
            const auto baseSID = static_cast<std::uint16_t>((shinyXor ^ tid) & 0xfff8);
            for (std::uint32_t offset = 0; offset < 8; offset++)
            {
                recover(static_cast<std::uint16_t>(tid), static_cast<std::uint16_t>(baseSID + offset), shinyXor, true);
            }
        }
        else
        {
            lastError = ErrorCode::InvalidMode;
            return 0;
        }

        return static_cast<std::uint32_t>(searchResults.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3id_result_ptr()
    {
        return !searchResults.empty() ? reinterpret_cast<std::uintptr_t>(searchResults.data())
                                      : reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_result_count()
    {
        return !searchResults.empty() ? static_cast<std::uint32_t>(searchResults.size())
                                      : static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3id_last_error()
    {
        return lastError;
    }
}
