/*
 * PokeRNGKit Gen III IVs to PID WebAssembly bridge.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz
 * Copyright (C) 2026 Hakuhiro
 *
 * Derived from PokeFinder's IVToPIDCalculator and LCRNGReverse under
 * GNU GPL-3.0-or-later. The bridge API and packed result format are
 * PokeRNGKit additions.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

#include "gen3ivtopid_bridge.h"

#include <Core/RNG/LCRNG.hpp>
#include <array>
#include <cstdint>
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
    constexpr std::uint32_t maxResults = 128;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        ResultLimit = 2,
    };

    thread_local std::vector<Gen3IvToPidPackedState> results;
    thread_local std::uint32_t lastError = ErrorCode::None;

    template <typename Rng>
    struct RecoverySeeds
    {
        std::array<std::uint32_t, 12> values {};
        std::uint32_t count = 0;
    };

    RecoverySeeds<PokeRNG> recoverPokeRNGIVMethod12(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr u32 lag0 = 0x6134;
        constexpr u32 lag1 = 0xC907;
        constexpr u32 lower = 0x64833CB0;
        constexpr u32 upper = 0x6483CBBC;
        const u32 first = static_cast<u32>((ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16);
        const u32 second = static_cast<u32>((ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16);
        const u64 tmp = ((PokeRNG::getMult() * first - second) >> 16) * lag1;
        const u32 lo = ((tmp + lower) >> 15) * lag0;
        const u32 middle = lo + lag0;
        const u32 up = ((tmp + upper) >> 15) * lag0;
        RecoverySeeds<PokeRNG> recovered;
        const auto recover = [&](u32 start) {
            for (u32 lowerBits = start % lag1; lowerBits < 0x10000; lowerBits += lag1)
            {
                const u32 seed = first | lowerBits;
                PokeRNG rng(seed);
                if ((rng.next() & 0x7fff0000) == second)
                {
                    recovered.values[recovered.count++] = seed;
                    recovered.values[recovered.count++] = seed ^ 0x80000000;
                }
            }
        };
        recover(lo);
        recover(middle);
        if (middle != up) recover(up);
        return recovered;
    }

    RecoverySeeds<PokeRNG> recoverPokeRNGIVMethod4(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr u32 lag0 = 0x6C31;
        constexpr u32 lag1 = 0x2E90;
        constexpr u32 lower = 0x4B8CE21D;
        constexpr u32 upper = 0x4B8D08D7;
        constexpr u32 mult = PokeRNGR::getMult() * PokeRNGR::getMult();
        const u32 first = static_cast<u32>((ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16);
        const u32 second = static_cast<u32>((ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16);
        const u32 tmp = ((first - second * mult) >> 16) * lag0;
        const u32 lo = (tmp + lower) >> 15;
        const u32 up = (tmp + upper) >> 15;
        RecoverySeeds<PokeRNG> recovered;
        const auto recover = [&](u32 start) {
            for (u32 lowerBits = (start * lag1) % lag0; lowerBits < 0x10000; lowerBits += lag0)
            {
                const u32 seed = second | lowerBits;
                PokeRNGR rng(seed, 2);
                if ((rng.getSeed() & 0x7fff0000) == first)
                {
                    recovered.values[recovered.count++] = rng.getSeed();
                    recovered.values[recovered.count++] = rng.getSeed() ^ 0x80000000;
                }
            }
        };
        recover(lo);
        if (lo != up) recover(up);
        return recovered;
    }

    RecoverySeeds<XDRNG> recoverXDRNGIV(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr u32 lag0 = 0x44C5;
        constexpr u32 lag1 = 0xE8D1;
        constexpr u32 lower = 0x1E694392;
        constexpr u32 upper = 0x1E69FAC8;
        const u32 first = static_cast<u32>((ivs[0] | (ivs[1] << 5) | (ivs[2] << 10)) << 16);
        const u32 second = static_cast<u32>((ivs[5] | (ivs[3] << 5) | (ivs[4] << 10)) << 16);
        const u64 tmp = ((XDRNGR::getMult() * second - first) >> 16) * lag1;
        const u32 lo = ((tmp + lower) >> 15) * lag0;
        const u32 middle = lo + lag0;
        const u32 up = ((tmp + upper) >> 15) * lag0;
        RecoverySeeds<XDRNG> recovered;
        const auto recover = [&](u32 start) {
            for (u32 lowerBits = start % lag1; lowerBits < 0x10000; lowerBits += lag1)
            {
                const u32 seed = second | lowerBits;
                XDRNGR rng(seed);
                if ((rng.next() & 0x7fff0000) == first)
                {
                    recovered.values[recovered.count++] = rng.getSeed();
                    recovered.values[recovered.count++] = rng.getSeed() ^ 0x80000000;
                }
            }
        };
        recover(lo);
        recover(middle);
        if (middle != up) recover(up);
        return recovered;
    }

    RecoverySeeds<XDRNG> recoverChannelIV(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr u32 r[] = { 0xFFD96A7C, 0xFE8F9BCA, 0x03282056, 0x00737133, 0x017CA524, 0xFA0B0157 };
        constexpr s64 lower[] = { 0x2AB966D1C2, 0x2169A3AA47, -0x5049D5FDC, -0x2AACDA387, 0xFE7FFFFFF, -0x898000001 };
        constexpr s64 upper[] = { 0x2E8966D1C3, 0x23D9A3AA48, -0x3549D5FDB, -0xDACDA386, 0x1098000000, -0x7E8000000 };
        const s64 f[] = {
            static_cast<s64>(-10 * ivs[0] + 23 * ivs[1] - ivs[2] - 15 * ivs[5] + 52 * ivs[3] - 53 * ivs[4]) << 27,
            static_cast<s64>(-14 * ivs[0] + 7 * ivs[1] - 18 * ivs[2] - 21 * ivs[5] - 26 * ivs[3] - 24 * ivs[4]) << 27,
            static_cast<s64>(24 * ivs[0] - 5 * ivs[1] + 22 * ivs[2] + 15 * ivs[5] - 5 * ivs[3] - 15 * ivs[4]) << 27,
            static_cast<s64>(-5 * ivs[0] - 24 * ivs[1] + 26 * ivs[2] - 12 * ivs[5] + 9 * ivs[3] + 14 * ivs[4]) << 27,
            static_cast<s64>(27 * ivs[1] - 18 * ivs[5] - 8 * ivs[3] - ivs[4]) << 27,
            static_cast<s64>(-27 * ivs[0] + 18 * ivs[2] + 8 * ivs[5] + ivs[3]) << 27,
        };
        const u32 min[] = {
            static_cast<u32>((f[0] + upper[0]) >> 32) * r[0], static_cast<u32>((f[1] + upper[1]) >> 32) * r[1],
            static_cast<u32>((f[2] + lower[2]) >> 32) * r[2], static_cast<u32>((f[3] + lower[3]) >> 32) * r[3],
            static_cast<u32>((f[4] + lower[4]) >> 32) * r[4], static_cast<u32>((f[5] + upper[5]) >> 32) * r[5],
        };
        const u32 max[] = {
            static_cast<u32>((f[0] + lower[0]) >> 32) * r[0] - r[0], static_cast<u32>((f[1] + lower[1]) >> 32) * r[1] - r[1],
            static_cast<u32>((f[2] + upper[2]) >> 32) * r[2] + r[2], static_cast<u32>((f[3] + upper[3]) >> 32) * r[3] + r[3],
            static_cast<u32>((f[4] + upper[4]) >> 32) * r[4] + r[4], static_cast<u32>((f[5] + lower[5]) >> 32) * r[5] - r[5],
        };
        RecoverySeeds<XDRNG> recovered;
        for (u32 x5 = min[5]; x5 != max[5]; x5 -= r[5]) for (u32 x4 = min[4]; x4 != max[4]; x4 += r[4])
        {
            const u32 l4 = x5 + x4;
            for (u32 x2 = min[2]; x2 != max[2]; x2 += r[2]) for (u32 x3 = min[3]; x3 != max[3]; x3 += r[3])
            {
                const u32 l3 = l4 + x2 + x3;
                for (u32 x1 = min[1]; x1 != max[1]; x1 -= r[1]) for (u32 x0 = min[0]; x0 != max[0]; x0 -= r[0])
                {
                    const u32 seed = l3 + x1 + x0;
                    if ((seed >> 27) != ivs[0]) continue;
                    XDRNG rng(seed);
                    if ((rng.next() >> 27) != ivs[1] || (rng.next() >> 27) != ivs[2]
                        || (rng.next() >> 27) != ivs[5] || (rng.next() >> 27) != ivs[3] || (rng.next() >> 27) != ivs[4]) continue;
                    recovered.values[recovered.count++] = seed;
                }
            }
        }
        return recovered;
    }

    void append(std::uint32_t seed, std::uint32_t pid, std::uint16_t sid, std::uint32_t method)
    {
        if (results.size() >= maxResults)
        {
            lastError = ErrorCode::ResultLimit;
            return;
        }
        const auto gender = static_cast<std::uint8_t>(pid & 0xff);
        results.push_back({ seed, pid, sid, method, pid & 1, gender > 30, gender > 63, gender > 126, gender > 190 });
    }

    void calculatePoke(std::array<std::uint8_t, 6> ivs, std::uint8_t nature, std::uint16_t tid)
    {
        const auto seeds = recoverPokeRNGIVMethod12(ivs);
        for (u32 index = 0; index < seeds.count; index++)
        {
            PokeRNGR rng(seeds.values[index]);
            const u16 high = rng.nextUShort();
            const u16 low = rng.nextUShort();
            const u16 sid = static_cast<u16>((high ^ low ^ tid) & 0xfff8);
            const u32 seed = rng.next();
            u32 pid = (static_cast<u32>(high) << 16) | low;
            if (pid % 25 == nature) append(seed, pid, sid, 1);
            pid = (static_cast<u32>(low) << 16) | high;
            if (pid % 25 == nature) append(seed, pid, sid, 2);
        }
        for (u32 index = 0; index < seeds.count; index++)
        {
            PokeRNGR rng(seeds.values[index], 1);
            const u16 high = rng.nextUShort();
            const u16 low = rng.nextUShort();
            const u16 sid = static_cast<u16>((high ^ low ^ tid) & 0xfff8);
            const u32 seed = rng.next();
            const u32 pid = (static_cast<u32>(high) << 16) | low;
            if (pid % 25 == nature) append(seed, pid, sid, 3);
        }
        const auto method4Seeds = recoverPokeRNGIVMethod4(ivs);
        for (u32 index = 0; index < method4Seeds.count; index++)
        {
            PokeRNGR rng(method4Seeds.values[index]);
            const u16 high = rng.nextUShort();
            const u16 low = rng.nextUShort();
            const u16 sid = static_cast<u16>((high ^ low ^ tid) & 0xfff8);
            const u32 seed = rng.next();
            const u32 pid = (static_cast<u32>(high) << 16) | low;
            if (pid % 25 == nature) append(seed, pid, sid, 4);
        }
    }

    void calculateXD(std::array<std::uint8_t, 6> ivs, std::uint8_t nature, std::uint16_t tid)
    {
        const auto seeds = recoverXDRNGIV(ivs);
        for (u32 index = 0; index < seeds.count; index++)
        {
            const u32 origin = seeds.values[index];
            const u32 seed = XDRNGR(origin).next();
            XDRNG rng(origin, 2);
            const u16 high = rng.nextUShort();
            const u16 low = rng.nextUShort();
            const u16 sid = static_cast<u16>((high ^ low ^ tid) & 0xfff8);
            const u32 pid = (static_cast<u32>(high) << 16) | low;
            if (pid % 25 == nature) append(seed, pid, sid, 5);
        }
    }

    void calculateChannel(std::array<std::uint8_t, 6> ivs, std::uint8_t nature)
    {
        const auto seeds = recoverChannelIV(ivs);
        for (u32 index = 0; index < seeds.count; index++)
        {
            XDRNGR rng(seeds.values[index], 3);
            u16 low = rng.nextUShort();
            u16 high = rng.nextUShort();
            const u16 sid = rng.nextUShort();
            const u32 seed = rng.next();
            if ((low > 7 ? 0 : 1) != (high ^ sid ^ 40122)) high ^= 0x8000;
            const u32 pid = (static_cast<u32>(high) << 16) | low;
            if (pid % 25 == nature) append(seed, pid, sid, 6);
        }
    }
}

static_assert(sizeof(Gen3IvToPidPackedState) == 36);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ivtopid_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen3ivtopid_calculate(
        std::uint32_t hp, std::uint32_t atk, std::uint32_t def, std::uint32_t spa, std::uint32_t spd,
        std::uint32_t spe, std::uint32_t nature, std::uint32_t tid)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (hp > 31 || atk > 31 || def > 31 || spa > 31 || spd > 31 || spe > 31 || nature > 24 || tid > 0xffff)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const std::array<std::uint8_t, 6> ivs = {
            static_cast<std::uint8_t>(hp), static_cast<std::uint8_t>(atk), static_cast<std::uint8_t>(def),
            static_cast<std::uint8_t>(spa), static_cast<std::uint8_t>(spd), static_cast<std::uint8_t>(spe),
        };
        calculatePoke(ivs, static_cast<std::uint8_t>(nature), static_cast<std::uint16_t>(tid));
        calculateXD(ivs, static_cast<std::uint8_t>(nature), static_cast<std::uint16_t>(tid));
        calculateChannel(ivs, static_cast<std::uint8_t>(nature));
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen3ivtopid_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ivtopid_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen3ivtopid_last_error() { return lastError; }
}
