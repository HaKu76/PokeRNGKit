/*
 * PokeRNGKit Gen VII Time Finder WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Initial-seed hashing is adapted from 3DSTimeFinder by Admiral-Fish
 * (GPL-3.0-or-later), based on its SHA256::hash implementation.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen7timefinder_bridge.h"

#include <array>
#include <bit>
#include <cstdint>

#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define POKERNGKIT_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define POKERNGKIT_KEEPALIVE
#endif

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::array<std::uint32_t, 64> roundConstants = {
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    };

    constexpr std::uint32_t swap(std::uint32_t value)
    {
        return ((value >> 24) & 0xffU) | ((value << 8) & 0xff0000U) | ((value >> 8) & 0xff00U) |
               ((value << 24) & 0xff000000U);
    }

    std::uint32_t initialSeed(std::uint32_t tick, std::uint32_t epochLow, std::uint32_t epochHigh)
    {
        std::array<std::uint32_t, 64> words{};
        words[0] = swap(tick);
        words[2] = swap(epochLow);
        words[3] = swap(epochHigh);
        words[4] = 0x80000000U;
        words[15] = 0x80U;
        // w[16] is invariant for this fixed 16-byte message.
        words[16] = swap(tick);
        for (std::size_t i = 17; i < words.size(); i++)
        {
            const auto s0 = std::rotr(words[i - 15], 7) ^ std::rotr(words[i - 15], 18) ^ (words[i - 15] >> 3);
            const auto s1 = std::rotr(words[i - 2], 17) ^ std::rotr(words[i - 2], 19) ^ (words[i - 2] >> 10);
            words[i] = s1 + words[i - 7] + s0 + words[i - 16];
        }

        std::uint32_t a = 0x6a09e667U;
        std::uint32_t b = 0xbb67ae85U;
        std::uint32_t c = 0x3c6ef372U;
        std::uint32_t d = 0xa54ff53aU;
        std::uint32_t e = 0x510e527fU;
        std::uint32_t f = 0x9b05688cU;
        std::uint32_t g = 0x1f83d9abU;
        std::uint32_t h = 0x5be0cd19U;
        for (std::size_t i = 0; i < words.size(); i++)
        {
            const auto s1 = std::rotr(e, 6) ^ std::rotr(e, 11) ^ std::rotr(e, 25);
            const auto ch = (e & f) ^ ((~e) & g);
            const auto temp1 = h + s1 + ch + roundConstants[i] + words[i];
            const auto s0 = std::rotr(a, 2) ^ std::rotr(a, 13) ^ std::rotr(a, 22);
            const auto maj = (a & b) ^ (a & c) ^ (b & c);
            const auto temp2 = s0 + maj;
            h = g;
            g = f;
            f = e;
            e = d + temp1;
            d = c;
            c = b;
            b = a;
            a = temp1 + temp2;
        }
        return swap(a + 0x6a09e667U);
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen7timefinder_api_version() { return apiVersion; }

    POKERNGKIT_KEEPALIVE std::uint32_t gen7timefinder_initial_seed(std::uint32_t tick, std::uint32_t epochLow,
                                                                    std::uint32_t epochHigh)
    {
        return initialSeed(tick, epochLow, epochHigh);
    }
}
