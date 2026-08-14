/*
 * PokeRNGKit Researcher native parity fixture
 * Copyright (C) 2026 Hakuhiro
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "researcher_bridge.h"

#include <cstdint>
#include <cstdlib>
#include <iomanip>
#include <iostream>

namespace
{
    std::uint64_t readU64(const std::uint32_t *words, std::size_t index)
    {
        return static_cast<std::uint64_t>(words[index]) | (static_cast<std::uint64_t>(words[index + 1]) << 32);
    }

    ResearcherCustomSpec defaultSpec(bool rng64Bit = false)
    {
        return { 0, rng64Bit ? 1U : 2U, 3, 0, 0, 0 };
    }

    void require(bool condition, const char *message)
    {
        if (!condition)
        {
            std::cerr << message << '\n';
            std::exit(EXIT_FAILURE);
        }
    }

    void assertFirst(std::uint32_t rng, std::uint64_t expected, const std::uint32_t *seeds)
    {
        ResearcherCustomSpec specs[10] {};
        for (auto &spec : specs)
            spec = defaultSpec(rng >= 7 && rng <= 11);
        require(researcher_begin(rng, seeds, 8, 0, specs, 10) == 1, "researcher_begin failed");
        require(researcher_generate(1) == 1, "researcher_generate failed");
        require(researcher_last_error() == 0, "researcher_last_error was not zero");
        const auto *words = reinterpret_cast<const std::uint32_t *>(researcher_result_ptr());
        require(researcher_result_count() == 1, "researcher_result_count was not one");
        const auto actual = readU64(words, 1);
        if (actual != expected)
        {
            std::cerr << "RNG " << rng << " expected 0x" << std::hex << expected << " but got 0x" << actual
                      << std::dec << '\n';
            std::exit(EXIT_FAILURE);
        }
    }
}

int main()
{
    std::uint32_t seeds[8] {};
    assertFirst(0, 0x6073ULL, seeds);
    assertFirst(1, 0xa3561a1ULL, seeds);
    assertFirst(2, 0x269ec3ULL, seeds);
    assertFirst(3, 0xa170f641ULL, seeds);
    assertFirst(4, 0x1ULL, seeds);
    assertFirst(5, 0x69c77f93ULL, seeds);
    assertFirst(6, 2357136044ULL, seeds);
    assertFirst(7, 0x269ec3ULL, seeds);
    assertFirst(8, 0x9b1ae6e9a384e6f9ULL, seeds);
    assertFirst(9, 1139168856888879704ULL, seeds);
    assertFirst(10, 9413281287807789659ULL, seeds);
    assertFirst(11, 5807750865143411619ULL, seeds);
    assertFirst(12, 0, seeds);
    assertFirst(13, 0, seeds);

    ResearcherCustomSpec specs[10] {};
    for (auto &spec : specs)
        spec = defaultSpec();
    specs[0] = { 1, 2, 3, 0, 1, 0 };
    specs[1] = { 1, 23, 3, 13, 0, 0 };
    require(researcher_begin(0, seeds, 8, 0, specs, 10) == 1, "custom researcher_begin failed");
    require(researcher_generate(2) == 2, "custom researcher_generate failed");
    const auto *words = reinterpret_cast<const std::uint32_t *>(researcher_result_ptr());
    require(readU64(words, 3) == 0x6074, "first custom 1 mismatch");
    require(readU64(words, 5) == 0x6074, "first custom 2 mismatch");
    require(readU64(words, 23 + 3) == 0xe97e7b6b, "second custom 1 mismatch");
    require(readU64(words, 23 + 5) == 0xe97edbdf, "second custom 2 mismatch");
    require(researcher_generate(10001) == 0, "oversized chunk was accepted");
    require(researcher_last_error() != 0, "oversized chunk did not set an error");

    require(researcher_begin(0, seeds, 8, UINT32_MAX, specs, 10) == 1, "maximum advance begin failed");
    require(researcher_generate(1) == 1, "maximum advance was not generated");
    words = reinterpret_cast<const std::uint32_t *>(researcher_result_ptr());
    require(words[0] == UINT32_MAX, "maximum advance label mismatch");
    require(researcher_generate(1) == 0, "exhausted advance range was accepted");
    require(researcher_last_error() != 0, "exhausted advance range did not set an error");

    std::cout << "researcher_native_parity: 1/1\n";
    return 0;
}
