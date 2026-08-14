/*
 * PokeRNGKit Researcher WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Researcher behavior and bundled RNG implementations are adapted from
 * PokeFinder 4.3.2 by Admiral_Fish, bumba, and EzPzStreamz
 * (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "researcher_bridge.h"

#include <Core/RNG/LCRNG.hpp>
// The module-local header supplies PokeFinder 4.3.2's consteval 64-bit jump table.
#include <Core/RNG/LCRNG64.hpp>
#include <Core/RNG/MT.hpp>
#include <Core/RNG/SFMT.hpp>
#include <Core/RNG/TinyMT.hpp>
#include <Core/RNG/Xoroshiro.hpp>
#include <Core/RNG/Xorshift.hpp>

#include <array>
#include <bit>
#include <cstdint>
#include <optional>
#include <variant>
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
    constexpr std::uint32_t seedWordCount = 8;
    constexpr std::uint32_t customCount = 10;
    constexpr std::uint32_t maximumChunkStates = 10000;
    constexpr std::uint32_t resultWords = 23;

    enum class Rng : std::uint32_t
    {
        Poke = 0,
        PokeReverse = 1,
        XD = 2,
        XDReverse = 3,
        AR = 4,
        ARReverse = 5,
        MT = 6,
        BW = 7,
        BWReverse = 8,
        SFMT = 9,
        Xoroshiro = 10,
        XoroshiroBDSP = 11,
        TinyMT = 12,
        Xorshift = 13,
    };

    enum class Operation : std::uint32_t
    {
        Multiply = 0,
        Divide = 1,
        Modulo = 2,
        Add = 3,
        Subtract = 4,
        ShiftLeft = 5,
        ShiftRight = 6,
        Less = 7,
        LessEqual = 8,
        Greater = 9,
        GreaterEqual = 10,
        And = 11,
        Xor = 12,
        Or = 13,
    };

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        InvalidRng = 2,
        InvalidCustom = 3,
        NoSession = 4,
        ChunkTooLarge = 5,
    };

    using Generator = std::variant<PokeRNG, PokeRNGR, XDRNG, XDRNGR, ARNG, ARNGR, MT, BWRNG, BWRNGR, SFMT,
                                   Xoroshiro, XoroshiroBDSP, TinyMT, Xorshift>;

    struct State
    {
        std::uint64_t prng = 0;
        std::array<std::uint64_t, customCount> customs {};
    };

    thread_local std::optional<Generator> generator;
    thread_local std::array<ResearcherCustomSpec, customCount> customSpecs {};
    thread_local std::optional<State> previous;
    thread_local std::vector<std::uint32_t> results;
    thread_local std::uint32_t currentAdvance = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool rng64Bit = false;
    thread_local bool advancesExhausted = false;

    std::uint64_t readU64(const std::uint32_t *words, std::uint32_t index)
    {
        return static_cast<std::uint64_t>(words[index]) | (static_cast<std::uint64_t>(words[index + 1]) << 32);
    }

    void appendU64(std::uint64_t value)
    {
        results.emplace_back(static_cast<std::uint32_t>(value));
        results.emplace_back(static_cast<std::uint32_t>(value >> 32));
    }

    bool is64BitRng(Rng rng)
    {
        return rng >= Rng::BW && rng <= Rng::XoroshiroBDSP;
    }

    bool validBaseOperand(std::uint32_t operand, bool is64Bit)
    {
        if (is64Bit)
        {
            return operand == 1 || (operand >= 3 && operand <= 6) || operand == 7 ||
                   (operand >= 9 && operand <= 12);
        }
        return operand == 2 || operand == 5 || operand == 6 || operand == 8 || operand == 11 || operand == 12;
    }

    bool validOperand(std::uint32_t operand, std::uint32_t index, bool is64Bit, bool allowNone)
    {
        if (allowNone && operand == 0)
        {
            return true;
        }
        if (validBaseOperand(operand, is64Bit))
        {
            return true;
        }
        if (operand >= 13 && operand < 13 + index)
        {
            return true;
        }
        return operand >= 23 && operand < 23 + index;
    }

    bool validSpecs(const ResearcherCustomSpec *specs, bool is64Bit)
    {
        for (std::uint32_t index = 0; index < customCount; index++)
        {
            const auto &spec = specs[index];
            if (spec.enabled > 1 || spec.operation > static_cast<std::uint32_t>(Operation::Or) ||
                !validOperand(spec.left, index, is64Bit, false) ||
                !validOperand(spec.right, index, is64Bit, true))
            {
                return false;
            }
        }
        return true;
    }

    std::uint64_t project(std::uint32_t operand, const State &state, const std::optional<State> &prior)
    {
        const State empty;
        const State &source = (operand >= 7 && operand <= 12) || operand >= 23 ? prior.value_or(empty) : state;
        switch (operand)
        {
        case 1:
        case 2:
        case 7:
        case 8:
            return source.prng;
        case 3:
        case 9:
            return source.prng >> 32;
        case 4:
        case 10:
            return source.prng & 0xffffffffULL;
        case 5:
        case 11:
            return rng64Bit ? source.prng >> 48 : source.prng >> 16;
        case 6:
        case 12:
            return rng64Bit ? (source.prng >> 32) & 0xffffULL : source.prng & 0xffffULL;
        default:
            if (operand >= 13 && operand <= 22)
            {
                return state.customs[operand - 13];
            }
            if (operand >= 23 && operand <= 32)
            {
                return source.customs[operand - 23];
            }
            return 0;
        }
    }

    std::uint64_t calculate(Operation operation, std::uint64_t left, std::uint64_t right)
    {
        switch (operation)
        {
        case Operation::Multiply:
            return left * right;
        case Operation::Divide:
            return right == 0 ? 0 : left / right;
        case Operation::Modulo:
            return right == 0 ? 0 : left % right;
        case Operation::Add:
            return left + right;
        case Operation::Subtract:
            return left - right;
        case Operation::ShiftLeft:
            return left << (right & 63);
        case Operation::ShiftRight:
            return left >> (right & 63);
        case Operation::Less:
            return left < right;
        case Operation::LessEqual:
            return left <= right;
        case Operation::Greater:
            return left > right;
        case Operation::GreaterEqual:
            return left >= right;
        case Operation::And:
            return left & right;
        case Operation::Xor:
            return left ^ right;
        case Operation::Or:
            return left | right;
        }
        return 0;
    }

    std::uint64_t nextValue()
    {
        return std::visit([](auto &rng) { return static_cast<std::uint64_t>(rng.next()); }, *generator);
    }

    std::optional<Generator> createGenerator(Rng rng, const std::uint32_t *seeds, std::uint32_t advances)
    {
        switch (rng)
        {
        case Rng::Poke:
        {
            PokeRNG value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::PokeReverse:
        {
            PokeRNGR value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::XD:
        {
            XDRNG value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::XDReverse:
        {
            XDRNGR value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::AR:
        {
            ARNG value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::ARReverse:
        {
            ARNGR value(seeds[0]);
            value.jump(advances);
            return value;
        }
        case Rng::MT:
            return MT(seeds[0], advances);
        case Rng::BW:
        {
            BWRNG value(readU64(seeds, 0));
            value.jump(advances);
            return value;
        }
        case Rng::BWReverse:
        {
            BWRNGR value(readU64(seeds, 0));
            value.jump(advances);
            return value;
        }
        case Rng::SFMT:
        {
            std::uint64_t seed = readU64(seeds, 0);
            SFMT value(static_cast<std::uint32_t>(seed > 0xffffffffULL ? seed >> 32 : seed));
            value.advance(advances);
            return value;
        }
        case Rng::Xoroshiro:
        {
            Xoroshiro value(readU64(seeds, 0));
            value.jump(advances);
            return value;
        }
        case Rng::XoroshiroBDSP:
        {
            XoroshiroBDSP value(readU64(seeds, 0));
            value.jump(advances);
            return value;
        }
        case Rng::TinyMT:
        {
            TinyMT value(seeds[0], seeds[2], seeds[4], seeds[6]);
            value.jump(advances);
            return value;
        }
        case Rng::Xorshift:
        {
            Xorshift value(readU64(seeds, 0), readU64(seeds, 2));
            value.jump(advances);
            return value;
        }
        }
        return std::nullopt;
    }
}

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t researcher_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t researcher_begin(std::uint32_t rngValue, const std::uint32_t *seedWordsValue,
                                                        std::uint32_t seedWordsLength,
                                                        std::uint32_t initialAdvances,
                                                        const ResearcherCustomSpec *customs,
                                                        std::uint32_t customsLength)
    {
        results.clear();
        generator.reset();
        previous.reset();
        advancesExhausted = false;
        lastError = ErrorCode::None;
        if (rngValue > static_cast<std::uint32_t>(Rng::Xorshift))
        {
            lastError = ErrorCode::InvalidRng;
            return 0;
        }
        if (seedWordsValue == nullptr || seedWordsLength != seedWordCount || customs == nullptr ||
            customsLength != customCount)
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        const auto rng = static_cast<Rng>(rngValue);
        rng64Bit = is64BitRng(rng);
        if (!validSpecs(customs, rng64Bit))
        {
            lastError = ErrorCode::InvalidCustom;
            return 0;
        }
        customSpecs = {};
        for (std::uint32_t index = 0; index < customCount; index++)
        {
            customSpecs[index] = customs[index];
        }
        generator = createGenerator(rng, seedWordsValue, initialAdvances);
        if (!generator)
        {
            lastError = ErrorCode::InvalidRng;
            return 0;
        }
        currentAdvance = initialAdvances;
        return 1;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t researcher_generate(std::uint32_t stateCount)
    {
        results.clear();
        lastError = ErrorCode::None;
        if (!generator)
        {
            lastError = ErrorCode::NoSession;
            return 0;
        }
        if (stateCount > maximumChunkStates)
        {
            lastError = ErrorCode::ChunkTooLarge;
            return 0;
        }
        if (stateCount > 0 &&
            (advancesExhausted || static_cast<std::uint64_t>(currentAdvance) + stateCount - 1 > UINT32_MAX))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        results.reserve(static_cast<std::size_t>(stateCount) * resultWords);
        for (std::uint32_t index = 0; index < stateCount; index++)
        {
            State state;
            state.prng = nextValue();
            for (std::uint32_t custom = 0; custom < customCount; custom++)
            {
                const auto &spec = customSpecs[custom];
                if (spec.enabled != 0)
                {
                    const auto left = project(spec.left, state, previous);
                    const auto right = spec.right == 0
                                           ? static_cast<std::uint64_t>(spec.rightLow) |
                                                 (static_cast<std::uint64_t>(spec.rightHigh) << 32)
                                           : project(spec.right, state, previous);
                    state.customs[custom] = calculate(static_cast<Operation>(spec.operation), left, right);
                }
            }
            results.emplace_back(currentAdvance);
            if (currentAdvance != UINT32_MAX)
                currentAdvance++;
            else
                advancesExhausted = true;
            appendU64(state.prng);
            for (const auto custom : state.customs)
            {
                appendU64(custom);
            }
            previous = state;
        }
        return stateCount;
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t researcher_result_ptr()
    {
        return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t researcher_result_count()
    {
        return static_cast<std::uint32_t>(results.size() / resultWords);
    }

    POKERNGKIT_KEEPALIVE std::uint32_t researcher_last_error()
    {
        return lastError;
    }
}
