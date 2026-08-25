/*
 * PokeRNGKit Gen VIII Egg WebAssembly bridge
 * Copyright (C) 2026 Hakuhiro
 *
 * Algorithm adapted from PokeFinder 4.3.2 EggGenerator8, EggSettings,
 * StateFilter, Xorshift, XoroshiroBDSP and State by Admiral_Fish, bumba,
 * and EzPzStreamz (GPL-3.0-or-later).
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
#include "gen8egg_bridge.h"

#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>
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
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumEvaluations = 250000000;
    constexpr std::uint32_t allNatures = 0x1ffffff;
    constexpr std::uint32_t allHiddenPowers = 0xffff;
    constexpr std::string_view allowedSpeciesBase64
        = "kiSpKCFKVZUkpVqVVbFejSvWCEmq9IrKRt3q1Z7cQ5CkQlKpNN2pX7Wpr6rrS04ASJJKlVaK1s+qDQCAAIIkpaqUmpzUtFZVUlqtpKRtrRMAAA==";

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::uint8_t gender;
        std::array<std::uint16_t, 3> abilities;
    };

    struct State
    {
        std::uint32_t advances;
        std::uint32_t seed;
        std::uint32_t ec;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::array<std::uint8_t, 6> inheritance;
        std::array<std::uint16_t, 6> stats;
        std::uint16_t abilityIndex;
        std::uint16_t species;
        std::uint8_t ability;
        std::uint8_t characteristic;
        std::uint8_t gender;
        std::uint8_t hiddenPower;
        std::uint8_t hiddenPowerStrength;
        std::uint8_t nature;
        std::uint8_t shiny;
    };

#include "personal_data.inc"

    constexpr std::uint64_t xorshiftJumpTable[25][2]
        = { { 0x10046d8b3ULL, 0xf985d65ffd3c8001ULL },
            { 0x956c89fbfa6b67e9ULL, 0xa42ca9aeb1e10da6ULL },
            { 0xff7aa97c47ec17c7ULL, 0x1a0988e988f8a56eULL },
            { 0x9dff33679bd01948ULL, 0xfb6668ff443b16f0ULL },
            { 0xbd36a1d3e3b212daULL, 0x46a4759b1dc83ce2ULL },
            { 0x6d2f354b8b0e3c0bULL, 0x9640bc4ca0cbaa6cULL },
            { 0xecf6383dca4f108fULL, 0x947096c72b4d52fbULL },
            { 0xe1054e817177890aULL, 0x0daf32f04ddca12eULL },
            { 0x02ae1912115107c6ULL, 0xb9fa05aab78641a5ULL },
            { 0x59981d3df81649beULL, 0x382fa5aa95f950e3ULL },
            { 0x6644b35f0f8cee00ULL, 0xdba31d29fc044fdbULL },
            { 0xecff213c169fd455ULL, 0x3ca16b953c338c19ULL },
            { 0xa9dfd9fb0a094939ULL, 0x3ffdcb096a60ecbeULL },
            { 0x079d7462b16c479fULL, 0xfd6aef50f8c0b5faULL },
            { 0x03896736d707b6b6ULL, 0x9148889b8269b55dULL },
            { 0xdea22e8899dbbeaaULL, 0x4c6ac659b91ef36aULL },
            { 0xc1150ddd5ae7d320ULL, 0x67ccf586cddb0649ULL },
            { 0x5f0be91ac7e9c381ULL, 0x33c8177d6b2cc0f0ULL },
            { 0x0cd15d2ba212e573ULL, 0x4a5f78fc104e47b9ULL },
            { 0xab586674147dec3eULL, 0xd69063e6e8a0b936ULL },
            { 0x4bfd9d67ed372866ULL, 0x7071114af22d34f5ULL },
            { 0xdaf387cab4ef5c18ULL, 0x686287302b5cd38cULL },
            { 0xffaf82745790af3eULL, 0xbb7d371f547cca1eULL },
            { 0x7b932849fe573afaULL, 0xeb96acd6c88829f9ULL },
            { 0x8cedf8dfe2d6e821ULL, 0xb4fd2c6573bf7047ULL } };

    thread_local std::vector<Gen8EggPackedResult> results;
    thread_local std::uint32_t processedCount = 0;
    thread_local std::uint32_t lastError = ErrorCode::None;
    thread_local bool resultLimitReached = false;

    int base64Value(char value)
    {
        if (value >= 'A' && value <= 'Z') return value - 'A';
        if (value >= 'a' && value <= 'z') return value - 'a' + 26;
        if (value >= '0' && value <= '9') return value - '0' + 52;
        if (value == '+') return 62;
        if (value == '/') return 63;
        return -1;
    }

    std::vector<std::uint8_t> decodeBase64(std::string_view encoded)
    {
        std::vector<std::uint8_t> decoded;
        decoded.reserve(encoded.size() * 3 / 4);
        std::uint32_t accumulator = 0;
        int bits = 0;
        for (const char value : encoded)
        {
            if (value == '=') break;
            const int digit = base64Value(value);
            if (digit < 0) continue;
            accumulator = (accumulator << 6) | static_cast<std::uint32_t>(digit);
            bits += 6;
            if (bits >= 8)
            {
                bits -= 8;
                decoded.push_back(static_cast<std::uint8_t>((accumulator >> bits) & 0xffU));
            }
        }
        return decoded;
    }

    const std::array<Personal, 494> &personalData()
    {
        static const std::array<Personal, 494> data = [] {
            std::array<Personal, 494> values = {};
            const auto decoded = decodeBase64(gen8EggPersonalBase64);
            if (decoded.size() != values.size() * 13) return values;
            for (std::size_t species = 0; species < values.size(); species++)
            {
                const std::size_t offset = species * 13;
                for (std::size_t index = 0; index < 6; index++) values[species].stats[index] = decoded[offset + index];
                values[species].gender = decoded[offset + 6];
                for (std::size_t index = 0; index < 3; index++)
                {
                    const std::size_t abilityOffset = offset + 7 + index * 2;
                    values[species].abilities[index]
                        = static_cast<std::uint16_t>(decoded[abilityOffset])
                        | (static_cast<std::uint16_t>(decoded[abilityOffset + 1]) << 8);
                }
            }
            return values;
        }();
        return data;
    }

    bool allowedSpecies(std::uint32_t species)
    {
        static const auto bits = decodeBase64(allowedSpeciesBase64);
        return species > 0 && species < 494 && species / 8 < bits.size()
            && (bits[species / 8] & (1U << (species % 8))) != 0;
    }

    class Xorshift
    {
    public:
        Xorshift(std::uint64_t seed0, std::uint64_t seed1, std::uint32_t advances) :
            state { static_cast<std::uint32_t>(seed0 >> 32), static_cast<std::uint32_t>(seed0),
                    static_cast<std::uint32_t>(seed1 >> 32), static_cast<std::uint32_t>(seed1) }
        {
            jump(advances);
        }

        std::uint32_t next()
        {
            std::uint32_t value = state[0];
            const std::uint32_t last = state[3];
            value ^= value << 11;
            value ^= value >> 8;
            value ^= last ^ (last >> 19);
            state[0] = state[1];
            state[1] = state[2];
            state[2] = state[3];
            state[3] = value;
            return value;
        }

    private:
        std::array<std::uint32_t, 4> state;

        void advance(std::uint32_t advances)
        {
            for (std::uint32_t index = 0; index < advances; index++) next();
        }

        void jump(std::uint32_t advances)
        {
            advance(advances & 0x7fU);
            advances >>= 7;
            for (std::size_t index = 0; advances != 0; advances >>= 1, index++)
            {
                if ((advances & 1U) == 0) continue;
                std::array<std::uint32_t, 4> jumped = {};
                for (int half = 1; half >= 0; half--)
                {
                    std::uint64_t value = xorshiftJumpTable[index][half];
                    for (int bit = 0; bit < 64; bit++, value >>= 1)
                    {
                        if ((value & 1ULL) != 0)
                            for (std::size_t word = 0; word < state.size(); word++) jumped[word] ^= state[word];
                        next();
                    }
                }
                state = jumped;
            }
        }
    };

    class FrameRng
    {
    public:
        FrameRng(std::uint64_t seed0, std::uint64_t seed1, std::uint32_t advances) : rng(seed0, seed1, advances)
        {
            list[0] = generate();
            list[1] = generate();
        }

        std::uint32_t next()
        {
            const std::uint32_t result = list[pointer++];
            pointer %= list.size();
            return result;
        }

        std::uint32_t next(std::uint32_t maximum)
        {
            return next() % maximum;
        }

        void advanceState()
        {
            list[head++] = generate();
            head %= list.size();
            pointer = head;
        }

    private:
        Xorshift rng;
        std::array<std::uint32_t, 2> list = {};
        std::size_t head = 0;
        std::size_t pointer = 0;

        std::uint32_t generate()
        {
            return (rng.next() % 0xffffffffU) + 0x80000000U;
        }
    };

    std::uint64_t splitmix(std::uint64_t seed)
    {
        seed = 0xbf58476d1ce4e5b9ULL * (seed ^ (seed >> 30));
        seed = 0x94d049bb133111ebULL * (seed ^ (seed >> 27));
        return seed ^ (seed >> 31);
    }

    class XoroshiroBdsp
    {
    public:
        explicit XoroshiroBdsp(std::uint64_t seed) :
            state0(splitmix(seed + 0x9e3779b97f4a7c15ULL)),
            state1(splitmix(seed + 0x3c6ef372fe94f82aULL))
        {
        }

        std::uint64_t next()
        {
            const std::uint64_t left = state0;
            std::uint64_t right = state1;
            const std::uint64_t result = left + right;
            right ^= left;
            state0 = std::rotl(left, 24) ^ right ^ (right << 16);
            state1 = std::rotl(right, 37);
            return result;
        }

        std::uint32_t nextUInt(std::uint32_t maximum)
        {
            return static_cast<std::uint32_t>(next() >> 32) % maximum;
        }

    private:
        std::uint64_t state0;
        std::uint64_t state1;
    };

    bool validParent(const Gen8EggPackedRequest &request, bool first)
    {
        const auto *ivs = first ? request.parentAIVs : request.parentBIVs;
        for (std::size_t index = 0; index < 6; index++)
            if (ivs[index] > 31) return false;
        const auto ability = first ? request.parentAAbility : request.parentBAbility;
        const auto gender = first ? request.parentAGender : request.parentBGender;
        const auto item = first ? request.parentAItem : request.parentBItem;
        const auto nature = first ? request.parentANature : request.parentBNature;
        return ability <= 2 && gender <= 3 && (item == 0 || item == 1 || item == 8) && nature <= 24;
    }

    bool compatibleParents(std::uint32_t left, std::uint32_t right)
    {
        return (left == 0 && right == 1) || (left == 1 && right == 0)
            || (left == 3 && right == 1) || (left == 1 && right == 3)
            || (left == 0 && right == 3) || (left == 3 && right == 0)
            || (left == 2 && right == 3) || (left == 3 && right == 2);
    }

    bool shouldReorder(const Gen8EggPackedRequest &request)
    {
        return (request.parentAGender == 1 && request.parentBGender == 0)
            || (request.parentAGender == 1 && request.parentBGender == 3)
            || (request.parentAGender == 3 && request.parentBGender == 0)
            || (request.parentAGender == 3 && request.parentBGender == 2);
    }

    void canonicalizeParents(Gen8EggPackedRequest &request)
    {
        if (!shouldReorder(request)) return;
        for (std::size_t index = 0; index < 6; index++) std::swap(request.parentAIVs[index], request.parentBIVs[index]);
        std::swap(request.parentAAbility, request.parentBAbility);
        std::swap(request.parentAGender, request.parentBGender);
        std::swap(request.parentAItem, request.parentBItem);
        std::swap(request.parentANature, request.parentBNature);
    }

    bool validRequest(const Gen8EggPackedRequest &request)
    {
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request.seed0High) << 32) | request.seed0Low;
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request.seed1High) << 32) | request.seed1Low;
        if (seed0 == 0 && seed1 == 0) return false;
        if (request.chunkCount == 0 || request.chunkStart >= maximumEvaluations
            || request.chunkCount > maximumEvaluations - request.chunkStart)
            return false;
        const std::uint64_t lastAdvance = static_cast<std::uint64_t>(request.initialAdvances) + request.offset
            + request.chunkStart + request.chunkCount - 1;
        if (lastAdvance > std::numeric_limits<std::uint32_t>::max()) return false;
        if (!(request.compatibility == 20 || request.compatibility == 40 || request.compatibility == 50
              || request.compatibility == 70 || request.compatibility == 80 || request.compatibility == 88))
            return false;
        if (request.tid > 0xffff || request.sid > 0xffff || request.shinyCharm > 1 || request.masuda > 1
            || request.filtersDisabled > 1 || !allowedSpecies(request.species) || !validParent(request, true)
            || !validParent(request, false) || !compatibleParents(request.parentAGender, request.parentBGender))
            return false;
        if (request.shinyFilter > 4 || request.genderFilter > 3 || request.abilityFilter > 3
            || request.natureMask == 0 || (request.natureMask & ~allNatures) != 0
            || request.hiddenPowerMask == 0 || (request.hiddenPowerMask & ~allHiddenPowers) != 0
            || request.resultLimit == 0 || request.resultLimit > maximumResults)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request.ivMin[index] > request.ivMax[index] || request.ivMax[index] > 31) return false;
        if (request.perfectIvValue > 31 || request.perfectIvCount > 6) return false;
        Gen8EggPackedRequest normalized = request;
        canonicalizeParents(normalized);
        const std::uint32_t donorAbility
            = normalized.parentBGender == 3 ? normalized.parentAAbility : normalized.parentBAbility;
        if (normalized.filtersDisabled == 0 && normalized.abilityFilter == 3 && donorAbility != 2) return false;
        return true;
    }

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        if (tsv == psv) return 2;
        return (tsv ^ psv) < 16 ? 1 : 0;
    }

    std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint8_t bits = 0;
        for (std::size_t index = 0; index < order.size(); index++) bits |= (ivs[order[index]] & 1U) << index;
        return bits * 15 / 63;
    }

    std::uint8_t hiddenPowerStrength(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint8_t bits = 0;
        for (std::size_t index = 0; index < order.size(); index++) bits |= ((ivs[order[index]] >> 1) & 1U) << index;
        return 30 + (bits * 40 / 63);
    }

    std::uint8_t characteristic(std::uint32_t ec, const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        const std::uint8_t start = ec % 6;
        std::uint8_t selected = start;
        std::uint8_t maximum = 0;
        for (std::uint8_t offset = 0; offset < 6; offset++)
        {
            const std::uint8_t index = (start + offset) % 6;
            if (ivs[order[index]] > maximum)
            {
                selected = index;
                maximum = ivs[order[index]];
            }
        }
        return selected * 5 + (maximum % 5);
    }

    std::array<std::uint16_t, 6> stats(
        const Personal &personal, const std::array<std::uint8_t, 6> &ivs, std::uint8_t nature)
    {
        constexpr std::array<std::uint8_t, 5> statMap = { 1, 2, 5, 3, 4 };
        const std::uint8_t raised = statMap[nature / 5];
        const std::uint8_t lowered = statMap[nature % 5];
        std::array<std::uint16_t, 6> values = {};
        for (std::size_t index = 0; index < values.size(); index++)
        {
            const std::uint16_t base = (2 * personal.stats[index] + ivs[index]) / 100;
            if (index == 0) values[index] = base + 11;
            else
            {
                const std::uint16_t raw = base + 5;
                values[index] = index == raised && raised != lowered ? raw * 110 / 100
                    : index == lowered && raised != lowered ? raw * 90 / 100
                    : raw;
            }
        }
        return values;
    }

    bool passesFilter(const Gen8EggPackedRequest &request, const State &state)
    {
        if (request.filtersDisabled != 0) return true;
        const bool shiny = request.shinyFilter == 0
            || (request.shinyFilter == 1 && state.shiny == 0)
            || (request.shinyFilter == 2 && state.shiny == 1)
            || (request.shinyFilter == 3 && state.shiny == 2)
            || (request.shinyFilter == 4 && state.shiny != 0);
        const bool gender = request.genderFilter == 0
            || (request.genderFilter == 1 && state.gender == 0)
            || (request.genderFilter == 2 && state.gender == 1)
            || (request.genderFilter == 3 && state.gender == 2);
        const bool ability = request.abilityFilter == 0
            || (request.abilityFilter == 1 && state.ability == 0)
            || (request.abilityFilter == 2 && state.ability == 1)
            || (request.abilityFilter == 3 && state.ability == 2);
        if (!shiny || !gender || !ability || (request.natureMask & (1U << state.nature)) == 0
            || (request.hiddenPowerMask & (1U << state.hiddenPower)) == 0)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (state.ivs[index] < request.ivMin[index] || state.ivs[index] > request.ivMax[index]) return false;
        if (std::count_if(state.ivs.begin(), state.ivs.end(), [&](std::uint8_t iv) {
                return iv >= request.perfectIvValue;
            }) < request.perfectIvCount)
            return false;
        return true;
    }

    std::uint32_t packBytes(const std::array<std::uint8_t, 6> &values, std::size_t offset)
    {
        std::uint32_t packed = 0;
        for (std::size_t index = 0; index < 4 && offset + index < values.size(); index++)
            packed |= static_cast<std::uint32_t>(values[offset + index]) << (index * 8);
        return packed;
    }

    std::uint32_t packInheritance(const std::array<std::uint8_t, 6> &values)
    {
        std::uint32_t packed = 0;
        for (std::size_t index = 0; index < values.size(); index++) packed |= static_cast<std::uint32_t>(values[index]) << (index * 2);
        return packed;
    }

    std::uint32_t packStats(const std::array<std::uint16_t, 6> &values, std::size_t offset)
    {
        return static_cast<std::uint32_t>(values[offset]) | (static_cast<std::uint32_t>(values[offset + 1]) << 16);
    }

    Gen8EggPackedResult pack(const State &state)
    {
        const std::uint32_t metadata = state.ability | (static_cast<std::uint32_t>(state.gender) << 2)
            | (static_cast<std::uint32_t>(state.nature) << 4) | (static_cast<std::uint32_t>(state.shiny) << 9)
            | (static_cast<std::uint32_t>(state.characteristic) << 11);
        return {
            state.advances,
            state.seed,
            state.ec,
            state.pid,
            metadata,
            packBytes(state.ivs, 0),
            packBytes(state.ivs, 4) | (static_cast<std::uint32_t>(state.hiddenPower) << 16)
                | (static_cast<std::uint32_t>(state.hiddenPowerStrength) << 24),
            packInheritance(state.inheritance),
            state.abilityIndex,
            packStats(state.stats, 0),
            packStats(state.stats, 2),
            packStats(state.stats, 4),
            state.species,
        };
    }

    void generate(Gen8EggPackedRequest request)
    {
        canonicalizeParents(request);
        const auto &personal = personalData();
        const Personal *base = &personal[request.species];
        const Personal *male = nullptr;
        const Personal *female = nullptr;
        if (request.species == 29 || request.species == 32)
        {
            male = &personal[32];
            female = &personal[29];
        }
        else if (request.species == 313 || request.species == 314)
        {
            male = &personal[313];
            female = &personal[314];
        }

        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request.seed0High) << 32) | request.seed0Low;
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request.seed1High) << 32) | request.seed1Low;
        FrameRng frameRng(seed0, seed1, request.initialAdvances + request.offset + request.chunkStart);
        const std::uint8_t pidRolls = (request.masuda != 0 ? 6 : 0) + (request.shinyCharm != 0 ? 2 : 0);
        const std::uint8_t inheritanceCount = request.parentAItem == 8 || request.parentBItem == 8 ? 5 : 3;
        const std::uint16_t tsv = static_cast<std::uint16_t>(request.tid ^ request.sid);

        for (std::uint32_t index = 0; index < request.chunkCount; index++, frameRng.advanceState())
        {
            processedCount++;
            if (frameRng.next(100) >= request.compatibility) continue;
            constexpr std::uint32_t signExtendMask = 0x80000000;
            const std::uint64_t seed
                = (static_cast<std::uint64_t>(frameRng.next()) ^ signExtendMask) - signExtendMask;
            XoroshiroBdsp rng(seed);

            const Personal *info = base;
            std::uint16_t species = static_cast<std::uint16_t>(request.species);
            std::uint8_t gender;
            if (male != nullptr && female != nullptr)
            {
                gender = rng.nextUInt(2);
                info = gender != 0 ? female : male;
                species = request.species == 29 || request.species == 32
                    ? static_cast<std::uint16_t>(gender != 0 ? 29 : 32)
                    : static_cast<std::uint16_t>(gender != 0 ? 314 : 313);
            }
            else if (base->gender == 255) gender = 2;
            else if (base->gender == 254) gender = 1;
            else if (base->gender == 0) gender = 0;
            else gender = rng.nextUInt(252) + 1 < base->gender;

            std::uint8_t nature = rng.nextUInt(25);
            const std::uint8_t everstones = (request.parentAItem == 1) + (request.parentBItem == 1);
            if (everstones == 2)
                nature = rng.nextUInt(2) == 0 ? request.parentANature : request.parentBNature;
            else if (request.parentAItem == 1) nature = request.parentANature;
            else if (request.parentBItem == 1) nature = request.parentBNature;

            const std::uint32_t parentAbility
                = request.parentBGender == 3 ? request.parentAAbility : request.parentBAbility;
            std::uint8_t ability = rng.nextUInt(100);
            if (parentAbility == 2) ability = ability < 20 ? 0 : ability < 40 ? 1 : 2;
            else if (parentAbility == 1) ability = ability < 20 ? 0 : 1;
            else ability = ability < 80 ? 0 : 1;

            std::array<std::uint8_t, 6> inheritance = {};
            for (std::uint8_t inherited = 0; inherited < inheritanceCount;)
            {
                const std::uint8_t stat = rng.nextUInt(6);
                if (inheritance[stat] != 0) continue;
                inheritance[stat] = rng.nextUInt(2) + 1;
                inherited++;
            }

            std::array<std::uint8_t, 6> ivs = {};
            for (std::size_t stat = 0; stat < ivs.size(); stat++)
            {
                std::uint8_t iv = rng.nextUInt(32);
                if (inheritance[stat] == 1) iv = request.parentAIVs[stat];
                else if (inheritance[stat] == 2) iv = request.parentBIVs[stat];
                ivs[stat] = iv;
            }

            const std::uint32_t ec = rng.nextUInt(0xffffffffU);
            std::uint32_t pid = 0;
            for (std::uint8_t roll = 0; roll < pidRolls; roll++)
            {
                pid = rng.nextUInt(0xffffffffU);
                if (((tsv ^ static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU))) < 16)) break;
            }

            State state = {
                request.initialAdvances + request.chunkStart + index,
                static_cast<std::uint32_t>(seed),
                ec,
                pid,
                ivs,
                inheritance,
                stats(*info, ivs, nature),
                info->abilities[ability],
                species,
                ability,
                characteristic(ec, ivs),
                gender,
                hiddenPower(ivs),
                hiddenPowerStrength(ivs),
                nature,
                shinyValue(pid, tsv),
            };
            if (!passesFilter(request, state)) continue;
            results.emplace_back(pack(state));
            if (results.size() >= request.resultLimit)
            {
                resultLimitReached = processedCount < request.chunkCount;
                break;
            }
        }
    }
}

static_assert(sizeof(Gen8EggPackedRequest) == 55 * sizeof(std::uint32_t));
static_assert(sizeof(Gen8EggPackedResult) == 13 * sizeof(std::uint32_t));

extern "C"
{
    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_generate(const Gen8EggPackedRequest *request)
    {
        results.clear();
        processedCount = 0;
        lastError = ErrorCode::None;
        resultLimitReached = false;
        if (request == nullptr || !validRequest(*request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        results.reserve(std::min(request->resultLimit, request->chunkCount));
        generate(*request);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uintptr_t gen8egg_result_ptr()
    {
        return results.empty() ? 0 : reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_limit_reached()
    {
        return resultLimitReached ? 1 : 0;
    }

    POKERNGKIT_KEEPALIVE std::uint32_t gen8egg_last_error()
    {
        return lastError;
    }
}
