/*
 * PokeRNGKit Gen III PID to IVs WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's PIDToIVCalculator under GNU GPL-3.0-or-later.
 * The bridge API and packed result format are PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3pidtoiv_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <Core/RNG/LCRNGReverse.hpp>
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
    constexpr std::uint32_t method1 = 1;
    constexpr std::uint32_t method2 = 3;
    constexpr std::uint32_t method4 = 4;
    constexpr std::uint32_t xdColo = 5;
    constexpr std::uint32_t channel = 6;

    thread_local std::vector<Gen3PidToIvPackedState> results;
    thread_local std::uint32_t lastError = 0;

    void append(std::uint32_t seed, std::uint16_t iv1, std::uint16_t iv2, std::uint32_t method)
    {
        results.push_back({
            seed,
            method,
            iv1 & 31u,
            (iv1 >> 5) & 31u,
            (iv1 >> 10) & 31u,
            (iv2 >> 5) & 31u,
            (iv2 >> 10) & 31u,
            iv2 & 31u,
        });
    }

    void append(std::uint32_t seed, std::uint8_t hp, std::uint8_t atk, std::uint8_t def, std::uint8_t spa,
                std::uint8_t spd, std::uint8_t spe, std::uint32_t method)
    {
        results.push_back({ seed, method, hp, atk, def, spa, spd, spe });
    }

    void calculateMethods124(std::uint32_t pid)
    {
        const auto seeds = LCRNGReverse::recoverPokeRNGPID(pid);
        for (int i = 0; i < seeds.count; i++)
        {
            const std::uint32_t seed = PokeRNGR(seeds[i]).next();
            PokeRNG forward(seeds[i], 1);
            const std::uint16_t iv1 = forward.nextUShort();
            const std::uint16_t iv2 = forward.nextUShort();
            const std::uint16_t iv3 = forward.nextUShort();
            append(seed, iv1, iv2, method1);
            append(seed, iv2, iv3, method2);
            append(seed, iv1, iv3, method4);
        }
    }

    void calculateXdColo(std::uint32_t pid)
    {
        const auto seeds = LCRNGReverse::recoverXDRNGPID(pid);
        for (int i = 0; i < seeds.count; i++)
        {
            XDRNGR backward(seeds[i], 1);
            const std::uint16_t iv2 = backward.nextUShort();
            const std::uint16_t iv1 = backward.nextUShort();
            append(backward.next(), iv1, iv2, xdColo);
        }
    }

    void calculateChannelCandidate(std::uint32_t pid, std::uint32_t recoveredPid)
    {
        const auto seeds = LCRNGReverse::recoverXDRNGPID(recoveredPid);
        for (int i = 0; i < seeds.count; i++)
        {
            XDRNGR backward(seeds[i]);
            const std::uint16_t sid = backward.nextUShort();
            const std::uint32_t seed = backward.next();
            XDRNG forward(seed, 1);
            std::uint16_t high = forward.nextUShort();
            const std::uint16_t low = forward.nextUShort();
            if ((low > 7 ? 0 : 1) != (high ^ 40122 ^ sid))
            {
                high ^= 0x8000;
            }
            if ((static_cast<std::uint32_t>(high) << 16 | low) != pid)
            {
                continue;
            }
            forward.advance(3);
            const std::uint8_t hp = forward.next() >> 27;
            const std::uint8_t atk = forward.next() >> 27;
            const std::uint8_t def = forward.next() >> 27;
            const std::uint8_t spe = forward.next() >> 27;
            const std::uint8_t spa = forward.next() >> 27;
            const std::uint8_t spd = forward.next() >> 27;
            append(seed, hp, atk, def, spa, spd, spe, channel);
        }
    }
}

static_assert(sizeof(Gen3PidToIvPackedState) == 32);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3pidtoiv_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pidtoiv_calculate(std::uint32_t pid)
    {
        results.clear();
        lastError = 0;
        calculateMethods124(pid);
        calculateXdColo(pid);
        calculateChannelCandidate(pid, pid);
        calculateChannelCandidate(pid, pid ^ 0x80000000u);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3pidtoiv_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pidtoiv_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3pidtoiv_last_error() { return lastError; }
}
