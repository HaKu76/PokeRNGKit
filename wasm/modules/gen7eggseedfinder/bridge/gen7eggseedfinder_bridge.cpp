/*
 * PokeRNGKit Gen VII Egg Seed Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Gen VII Egg Seed Finder behavior is adapted from 3DSRNGTool by wwwwwzx
 * (MIT), including its TinyMT implementation and Magikarp calculator.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7eggseedfinder_bridge.h"

#include <array>
#include <bit>
#include <cstdint>
#include <vector>

#include "magikarp_matrix.hpp"

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t none = 0;
    constexpr std::uint32_t invalidInput = 1;
    thread_local std::vector<Gen7EggSeedFinderResult> results;
    thread_local std::array<std::uint32_t, 4> magikarpResult {};
    thread_local std::uint32_t lastError = none;

    class TinyMT
    {
      public:
        explicit TinyMT(std::uint32_t seed) { initialize(seed); }
        explicit TinyMT(const std::array<std::uint32_t, 4> &state) : state_(state) {}

        void next()
        {
            auto y = state_[3];
            auto x = (state_[0] & 0x7fffffffU) ^ state_[1] ^ state_[2];
            x ^= x << 1;
            y ^= y >> 1 ^ x;
            state_[0] = state_[1];
            state_[1] = state_[2];
            state_[2] = x ^ y << 10;
            state_[3] = y;
            if ((y & 1U) != 0)
            {
                state_[1] ^= 0x8f7011eeU;
                state_[2] ^= 0xfc78ff1fU;
            }
        }

        std::uint32_t nextUint()
        {
            next();
            auto t0 = state_[3];
            auto t1 = state_[0] + (state_[2] >> 8);
            t0 ^= t1;
            if ((t1 & 1U) != 0) t0 ^= 0x3793fdffU;
            return t0;
        }

        const std::array<std::uint32_t, 4> &state() const { return state_; }

      private:
        std::array<std::uint32_t, 4> state_ {};

        void initialize(std::uint32_t seed)
        {
            state_ = {seed, 0x8f7011eeU, 0xfc78ff1fU, 0x3793fdffU};
            for (std::uint32_t i = 1; i < 8; i++)
                state_[i & 3] ^= i + 1812433253U * (state_[(i - 1) & 3] ^ (state_[(i - 1) & 3] >> 30));
            if ((state_[0] & 0x7fffffffU) == 0 && state_[1] == 0 && state_[2] == 0 && state_[3] == 0)
                state_ = {'T', 'I', 'N', 'Y'};
            for (int i = 0; i < 8; i++) next();
        }
    };

    void generateRest(TinyMT &rng, std::uint32_t advance)
    {
        rng.next();
        auto first = rng.nextUint() % 6;
        rng.next();
        std::uint32_t second;
        do { second = rng.nextUint() % 6; } while (second == first);
        rng.next();
        std::uint32_t third;
        do { third = rng.nextUint() % 6; } while (third == first || third == second);
        (void)third;
        for (std::uint32_t i = 0; i < advance; i++) rng.next();
    }

    bool matches(TinyMT &rng, const std::array<std::uint32_t, 8> &natureList, std::uint32_t advance)
    {
        for (int i = 0; i < 7; i++)
        {
            rng.next();
            if (rng.nextUint() % 25 != natureList[static_cast<std::size_t>(i)]) return false;
            generateRest(rng, advance);
        }
        rng.next();
        return rng.nextUint() % 25 == natureList[7];
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eggseedfinder_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7eggseedfinder_search(std::uint32_t startSeed,
                                                                 std::uint32_t endSeed,
                                                                 const std::uint32_t *natureList,
                                                                 std::uint32_t shinyCharm)
    {
        results.clear();
        lastError = none;
        if (natureList == nullptr || endSeed < startSeed || shinyCharm > 1)
        {
            lastError = invalidInput;
            return 0;
        }
        std::array<std::uint32_t, 8> natures {};
        for (std::size_t i = 0; i < natures.size(); i++)
        {
            natures[i] = natureList[i];
            if (natures[i] > 25)
            {
                lastError = invalidInput;
                return 0;
            }
        }
        const auto advance = shinyCharm != 0 ? 12U : 10U;
        for (std::uint64_t candidate = startSeed;; candidate++)
        {
            TinyMT rng(static_cast<std::uint32_t>(candidate));
            if (matches(rng, natures, advance))
            {
                const TinyMT initial(static_cast<std::uint32_t>(candidate));
                const auto &state = initial.state();
                results.push_back({state[0], state[1], state[2], state[3]});
            }
            if (candidate == endSeed || candidate == 0xffffffffULL) break;
        }
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE const Gen7EggSeedFinderResult *gen7eggseedfinder_result_ptr() { return results.data(); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eggseedfinder_result_count() { return static_cast<std::uint32_t>(results.size()); }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7eggseedfinder_magikarp(const std::uint8_t *bits,
                                                                  std::uint32_t length)
    {
        lastError = none;
        magikarpResult.fill(0);
        if (bits == nullptr || length != 127)
        {
            lastError = invalidInput;
            return 0;
        }
        std::array<std::uint32_t, 4> input {};
        for (std::uint32_t i = 0; i < 127; i++)
        {
            if (bits[i] > 1)
            {
                lastError = invalidInput;
                return 0;
            }
            if (bits[i] != 0) input[i / 32] |= 1U << (i % 32);
        }
        for (std::uint32_t row = 0; row < 127; row++)
        {
            std::uint32_t parity = 0;
            for (std::uint32_t word = 0; word < 4; word++)
                parity ^= static_cast<std::uint32_t>(std::popcount(kInverse[row * 4 + word] & input[word]) & 1U);
            if (parity != 0)
            {
                std::uint32_t word;
                std::uint32_t bit;
                if (row < 31)
                {
                    word = 0;
                    bit = row;
                }
                else if (row < 63)
                {
                    word = 1;
                    bit = row - 31;
                }
                else if (row < 95)
                {
                    word = 2;
                    bit = row - 63;
                }
                else
                {
                    word = 3;
                    bit = row - 95;
                }
                magikarpResult[word] |= 1U << bit;
            }
        }
        return 1;
    }

    POKERNGKIT_KEEPALIVE const std::uint32_t *gen7eggseedfinder_magikarp_result_ptr() { return magikarpResult.data(); }
    POKERNGKIT_KEEPALIVE std::uint32_t gen7eggseedfinder_last_error() { return lastError; }
}
