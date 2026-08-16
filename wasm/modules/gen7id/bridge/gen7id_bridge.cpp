/*
 * PokeRNGKit Gen VII ID WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII ID behavior is adapted from 3DSRNGTool by wwwwwzx (MIT),
 * including its SFMT implementation by Rei HOBARA.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7id_bridge.h"

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
    constexpr std::uint32_t maxStatesPerCall = 100000;
    enum ErrorCode : std::uint32_t { None = 0, RangeTooLarge = 1, InvalidInput = 2 };
    thread_local std::vector<Gen7IdPackedState> results;
    thread_local std::uint32_t lastError = None;

    class SFMT
    {
      public:
        static constexpr int N = 156;
        static constexpr int N32 = N * 4;
        static constexpr int POS1 = 122;
        static constexpr int SL1 = 18;
        static constexpr int SR1 = 11;
        static constexpr std::uint32_t MSK1 = 0xdfffffefU;
        static constexpr std::uint32_t MSK2 = 0xddfecb7fU;
        static constexpr std::uint32_t MSK3 = 0xbffaffffU;
        static constexpr std::uint32_t MSK4 = 0xbffffff6U;
        std::array<std::uint32_t, N32> state {};
        int index = N32;

        explicit SFMT(std::uint32_t seed)
        {
            state[0] = seed;
            for (int i = 1; i < N32; i++) state[i] = 1812433253U * (state[i - 1] ^ (state[i - 1] >> 30)) + static_cast<std::uint32_t>(i);
            periodCertification();
        }

        std::uint32_t nextUint()
        {
            if (index >= N32) { generate(); index = 0; }
            return state[index++];
        }
        std::uint64_t nextUlong() { return static_cast<std::uint64_t>(nextUint()) | (static_cast<std::uint64_t>(nextUint()) << 32); }

      private:
        void periodCertification()
        {
            constexpr std::array<std::uint32_t, 4> parity = { 1U, 0U, 0U, 0x13c9e684U };
            std::uint32_t inner = 0;
            for (int i = 0; i < 4; i++) inner ^= state[i] & parity[i];
            for (int i = 16; i > 0; i >>= 1) inner ^= inner >> i;
            if ((inner & 1U) != 0) return;
            for (int i = 0; i < 4; i++) for (std::uint32_t bit = 1; bit != 0; bit <<= 1) if ((bit & parity[i]) != 0) { state[i] ^= bit; return; }
        }
        void generate()
        {
            int a = 0, b = POS1 * 4, c = (N - 2) * 4, d = (N - 1) * 4;
            do
            {
                state[a + 3] ^= state[a + 3] << 8 ^ state[a + 2] >> 24 ^ state[c + 3] >> 8 ^ (state[b + 3] >> SR1 & MSK4) ^ state[d + 3] << SL1;
                state[a + 2] ^= state[a + 2] << 8 ^ state[a + 1] >> 24 ^ state[c + 3] << 24 ^ state[c + 2] >> 8 ^ (state[b + 2] >> SR1 & MSK3) ^ state[d + 2] << SL1;
                state[a + 1] ^= state[a + 1] << 8 ^ state[a] >> 24 ^ state[c + 2] << 24 ^ state[c + 1] >> 8 ^ (state[b + 1] >> SR1 & MSK2) ^ state[d + 1] << SL1;
                state[a] ^= state[a] << 8 ^ state[c + 1] << 24 ^ state[c] >> 8 ^ (state[b] >> SR1 & MSK1) ^ state[d] << SL1;
                c = d; d = a; a += 4; b += 4; if (b >= N32) b = 0;
            } while (a < N32);
        }
    };

    std::uint32_t power10(std::uint32_t exponent)
    {
        std::uint32_t result = 1;
        while (exponent-- != 0) result *= 10;
        return result;
    }

    bool decimalContains(std::uint32_t value, std::uint32_t width, std::uint32_t filterValue,
                         std::uint32_t filterDigits)
    {
        const auto filterBase = power10(filterDigits);
        for (std::uint32_t offset = 0; offset + filterDigits <= width; offset++)
        {
            const auto divisor = power10(width - offset - filterDigits);
            if ((value / divisor) % filterBase == filterValue) return true;
        }
        return false;
    }

    bool matches(std::uint64_t rand, std::uint16_t tid, std::uint16_t sid, std::uint16_t tsv,
                 std::uint32_t g7tid,
                 std::uint32_t mode, std::uint32_t value, std::uint32_t filterDigits,
                 std::uint32_t filterTsv, std::uint64_t filterRand, std::uint32_t randDigits)
    {
        if (mode == 1 && !decimalContains(tid, 5, value, filterDigits)) return false;
        if (mode == 2 && !decimalContains(sid, 5, value, filterDigits)) return false;
        if (mode == 3 && (static_cast<std::uint32_t>(sid) << 16 | tid) != value) return false;
        if (mode == 4 && !decimalContains(g7tid, 6, value, filterDigits)) return false;
        if (filterTsv != 0xffffffffU && tsv != filterTsv) return false;
        if (randDigits != 0)
        {
            const auto mask = randDigits == 16 ? 0xffffffffffffffffULL : (1ULL << (randDigits * 4)) - 1;
            bool found = false;
            for (std::uint32_t offset = 0; offset + randDigits <= 16; offset++)
            {
                if (((rand >> ((16 - offset - randDigits) * 4)) & mask) == filterRand)
                {
                    found = true;
                    break;
                }
            }
            if (!found) return false;
        }
        return true;
    }
}

static_assert(sizeof(Gen7IdPackedState) == 32);

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7id_api_version() { return apiVersion; }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7id_generate(std::uint32_t seed, std::uint32_t minAdvances, std::uint32_t maxAdvances,
                                                       std::uint32_t correction, std::uint32_t filterMode, std::uint32_t filterValue,
                                                       std::uint32_t filterDigits,
                                                       std::uint32_t tsv, std::uint32_t rand64Low, std::uint32_t rand64High,
                                                       std::uint32_t randDigits)
    {
        results.clear(); lastError = None;
        if (maxAdvances < minAdvances || maxAdvances - minAdvances >= maxStatesPerCall || correction > 16) { lastError = RangeTooLarge; return 0; }
        if (filterMode > 4 || (filterMode == 3 && filterDigits != 0) || ((filterMode == 1 || filterMode == 2) && (filterDigits == 0 || filterDigits > 5)) || (filterMode == 4 && (filterDigits == 0 || filterDigits > 6)) || (tsv != 0xffffffffU && tsv > 4095)) { lastError = InvalidInput; return 0; }
        const std::uint64_t filterRand = static_cast<std::uint64_t>(rand64Low) | (static_cast<std::uint64_t>(rand64High) << 32);
        if (randDigits > 16) { lastError = InvalidInput; return 0; }
        SFMT rng(seed);
        for (std::uint32_t i = 0; i < minAdvances; i++) rng.nextUlong();
        for (std::uint32_t advance = minAdvances;; advance++)
        {
            const std::uint64_t rand = rng.nextUlong();
            const std::uint32_t raw = static_cast<std::uint32_t>(rand);
            const auto tid = static_cast<std::uint16_t>(raw);
            const auto sid = static_cast<std::uint16_t>(raw >> 16);
            const auto xorValue = static_cast<std::uint16_t>(tid ^ sid);
            const auto id = static_cast<std::uint32_t>(sid) << 16 | tid;
            const auto g7tid = static_cast<std::uint32_t>(id % 1000000U);
            if (matches(rand, tid, sid, static_cast<std::uint16_t>(xorValue >> 4), g7tid,
                        filterMode, filterValue, filterDigits, tsv, filterRand, randDigits))
            {
                results.push_back({ static_cast<std::uint32_t>(rand), static_cast<std::uint32_t>(rand >> 32), id,
                                    static_cast<std::uint32_t>(xorValue >> 4) | static_cast<std::uint32_t>(xorValue & 0xf) << 16,
                                    advance, g7tid, static_cast<std::uint32_t>((rand % 17 + correction) % 17), 0 });
            }
            if (advance == maxAdvances) break;
        }
        return static_cast<std::uint32_t>(results.size());
    }
    POKERNGKIT_KEEPALIVE std::uintptr_t gen7id_result_ptr() { return reinterpret_cast<std::uintptr_t>(results.data()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7id_result_count() { return static_cast<std::uint32_t>(results.size()); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7id_last_error() { return lastError; }
}
