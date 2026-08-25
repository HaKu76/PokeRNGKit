/*
 * This file is part of PokeRNGKit.
 * Derived from PokeFinder 4.3.2 StaticGenerator8, StateFilter, State8,
 * Xorshift, XoroshiroBDSP and RNGList.
 * Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz.
 * GPL-3.0-or-later.
 */
#include "gen8static_bridge.h"

#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>
#include <vector>

namespace
{
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t maximumEvaluations = 250000000;
    constexpr std::uint32_t allNatures = 0x1ffffff;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidInput = 1,
        RangeTooLarge = 2,
    };

    enum RequestIndex : std::size_t
    {
        Seed0Low = 0,
        Seed0High = 1,
        Seed1Low = 2,
        Seed1High = 3,
        InitialAdvances = 4,
        Offset = 5,
        ChunkStart = 6,
        ChunkCount = 7,
        ProfileTid = 8,
        ProfileSid = 9,
        Species = 10,
        Form = 11,
        ShinyType = 12,
        TemplateAbility = 13,
        IvCount = 14,
        Level = 15,
        Fateful = 16,
        Roamer = 17,
        Lead = 18,
        FiltersDisabled = 19,
        ShinyMask = 20,
        GenderFilter = 21,
        AbilityFilter = 22,
        NatureMask = 23,
        HeightMin = 24,
        HeightMax = 25,
        WeightMin = 26,
        WeightMax = 27,
        IvMin = 28,
        IvMax = 34,
        PerfectIvValue = 40,
        PerfectIvCount = 41,
        ResultLimit = 42,
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
        std::uint32_t ec;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::array<std::uint16_t, 6> stats;
        std::uint16_t abilityIndex;
        std::uint8_t ability;
        std::uint8_t characteristic;
        std::uint8_t gender;
        std::uint8_t height;
        std::uint8_t nature;
        std::uint8_t shiny;
        std::uint8_t weight;
    };

    struct PackedResult
    {
        std::uint32_t advances;
        std::uint32_t ec;
        std::uint32_t pid;
        std::uint32_t metadata;
        std::uint32_t measures;
        std::uint32_t ivs0;
        std::uint32_t ivs1;
        std::uint32_t abilityIndex;
        std::uint32_t stats01;
        std::uint32_t stats23;
        std::uint32_t stats45;
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

    thread_local std::vector<PackedResult> results;
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
            const auto decoded = decodeBase64(gen8StaticPersonalBase64);
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

        std::uint32_t frameValue()
        {
            return (next() % 0xffffffffU) + 0x80000000U;
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
            for (auto &value : list) value = rng.frameValue();
        }

        std::uint32_t next()
        {
            const std::uint32_t value = list[pointer++];
            pointer %= list.size();
            return value;
        }

        std::uint32_t next(std::uint32_t maximum)
        {
            return next() % maximum;
        }

        void advanceState()
        {
            list[head++] = rng.frameValue();
            head %= list.size();
            pointer = head;
        }

    private:
        Xorshift rng;
        std::array<std::uint32_t, 32> list = {};
        std::size_t head = 0;
        std::size_t pointer = 0;
    };

    std::uint64_t splitmix(std::uint64_t seed)
    {
        seed = 0xBF58476D1CE4E5B9ULL * (seed ^ (seed >> 30));
        seed = 0x94D049BB133111EBULL * (seed ^ (seed >> 27));
        return seed ^ (seed >> 31);
    }

    class XoroshiroBDSP
    {
    public:
        explicit XoroshiroBDSP(std::uint64_t seed) :
            state0(splitmix(seed + 0x9E3779B97F4A7C15ULL)), state1(splitmix(seed + 0x3C6EF372FE94F82AULL))
        {
        }

        std::uint32_t nextUInt(std::uint32_t maximum)
        {
            return static_cast<std::uint32_t>(next() >> 32) % maximum;
        }

    private:
        std::uint64_t state0;
        std::uint64_t state1;

        std::uint64_t next()
        {
            const std::uint64_t result = state0 + state1;
            state1 ^= state0;
            state0 = std::rotl(state0, 24) ^ state1 ^ (state1 << 16);
            state1 = std::rotl(state1, 37);
            return result;
        }
    };

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        if (tsv == psv) return 2;
        return (tsv ^ psv) < 16 ? 1 : 0;
    }

    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ (pid & 0xffffU));
        return (tsv ^ psv) < 16;
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
        const Personal &personal, const std::array<std::uint8_t, 6> &ivs, std::uint8_t nature, std::uint8_t level)
    {
        constexpr std::array<std::uint8_t, 5> natureMap = { 1, 2, 5, 3, 4 };
        const std::uint8_t raised = natureMap[nature / 5];
        const std::uint8_t lowered = natureMap[nature % 5];
        std::array<std::uint16_t, 6> values = {};
        for (std::size_t index = 0; index < values.size(); index++)
        {
            const std::uint32_t scaled = ((2U * personal.stats[index] + ivs[index]) * level) / 100;
            if (index == 0)
            {
                values[index] = static_cast<std::uint16_t>(scaled + level + 10);
                continue;
            }
            const std::uint32_t raw = scaled + 5;
            values[index] = static_cast<std::uint16_t>(
                raised == lowered ? raw : index == raised ? raw * 11 / 10 : index == lowered ? raw * 9 / 10 : raw);
        }
        return values;
    }

    bool passesFilter(const std::uint32_t *request, const State &state)
    {
        if (request[FiltersDisabled] != 0) return true;
        if ((request[ShinyMask] & (1U << state.shiny)) == 0) return false;
        if (request[GenderFilter] != 255 && request[GenderFilter] != state.gender) return false;
        if (request[AbilityFilter] != 255 && request[AbilityFilter] != state.ability) return false;
        if ((request[NatureMask] & (1U << state.nature)) == 0) return false;
        if (state.height < request[HeightMin] || state.height > request[HeightMax]) return false;
        if (state.weight < request[WeightMin] || state.weight > request[WeightMax]) return false;
        for (std::size_t index = 0; index < 6; index++)
            if (state.ivs[index] < request[IvMin + index] || state.ivs[index] > request[IvMax + index]) return false;
        if (std::count_if(state.ivs.begin(), state.ivs.end(), [&](std::uint8_t iv) { return iv >= request[PerfectIvValue]; }) < request[PerfectIvCount]) return false;
        return true;
    }

    std::uint32_t packBytes(const std::array<std::uint8_t, 6> &values, std::size_t offset)
    {
        std::uint32_t packed = 0;
        const std::size_t count = std::min<std::size_t>(4, values.size() - offset);
        for (std::size_t index = 0; index < count; index++)
            packed |= static_cast<std::uint32_t>(values[offset + index]) << (index * 8);
        return packed;
    }

    std::uint32_t packStats(const std::array<std::uint16_t, 6> &values, std::size_t offset)
    {
        return values[offset] | (static_cast<std::uint32_t>(values[offset + 1]) << 16);
    }

    PackedResult pack(const State &state)
    {
        const std::uint32_t metadata = state.ability | (static_cast<std::uint32_t>(state.gender) << 2)
            | (static_cast<std::uint32_t>(state.nature) << 4) | (static_cast<std::uint32_t>(state.shiny) << 9)
            | (static_cast<std::uint32_t>(state.characteristic) << 11);
        const std::uint32_t measures = state.height | (static_cast<std::uint32_t>(state.weight) << 8);
        return { state.advances, state.ec, state.pid, metadata, measures, packBytes(state.ivs, 0), packBytes(state.ivs, 4),
                 state.abilityIndex, packStats(state.stats, 0), packStats(state.stats, 2), packStats(state.stats, 4) };
    }

    bool validRequest(const std::uint32_t *request)
    {
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request[Seed0High]) << 32) | request[Seed0Low];
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request[Seed1High]) << 32) | request[Seed1Low];
        if ((seed0 == 0 && seed1 == 0) || request[ChunkCount] == 0) return false;
        const std::uint64_t lastAdvance = static_cast<std::uint64_t>(request[InitialAdvances]) + request[Offset]
            + request[ChunkStart] + request[ChunkCount] - 1;
        if (lastAdvance > std::numeric_limits<std::uint32_t>::max()) return false;
        const bool validAbility = request[TemplateAbility] <= 2 || request[TemplateAbility] == 255;
        const bool validLead = request[Lead] <= 26 || request[Lead] == 255;
        const bool validGenderFilter = request[GenderFilter] <= 1 || request[GenderFilter] == 255;
        const bool validAbilityFilter = request[AbilityFilter] <= 2 || request[AbilityFilter] == 255;
        if (request[ProfileTid] > 0xffff || request[ProfileSid] > 0xffff || request[Species] == 0 || request[Species] > 493
            || request[Form] > 31 || request[ShinyType] > 1 || !validAbility || request[IvCount] > 3
            || request[Level] == 0 || request[Level] > 100 || request[Fateful] > 1 || request[Roamer] > 1
            || !validLead || request[FiltersDisabled] > 1 || request[ShinyMask] == 0 || !validGenderFilter
            || !validAbilityFilter || request[NatureMask] == 0 || (request[NatureMask] & ~allNatures) != 0
            || request[HeightMin] > request[HeightMax] || request[HeightMax] > 255
            || request[WeightMin] > request[WeightMax] || request[WeightMax] > 255
            || request[ResultLimit] == 0 || request[ResultLimit] > maximumResults)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request[IvMin + index] > request[IvMax + index] || request[IvMax + index] > 31) return false;
        if (request[PerfectIvValue] > 31 || request[PerfectIvCount] > 6) return false;
        return true;
    }

    void storeState(const std::uint32_t *request, State &state, const Personal &personal)
    {
        processedCount++;
        state.characteristic = characteristic(state.ec, state.ivs);
        state.abilityIndex = personal.abilities[state.ability];
        state.stats = stats(personal, state.ivs, state.nature, static_cast<std::uint8_t>(request[Level]));
        if (!passesFilter(request, state)) return;
        results.emplace_back(pack(state));
        if (results.size() >= request[ResultLimit])
            resultLimitReached = processedCount < request[ChunkCount];
    }

    void generateNonRoamer(const std::uint32_t *request, std::uint64_t seed0, std::uint64_t seed1)
    {
        const Personal &personal = personalData()[request[Species]];
        const std::uint16_t tsv = static_cast<std::uint16_t>(request[ProfileTid] ^ request[ProfileSid]);
        FrameRng rng(seed0, seed1, request[InitialAdvances] + request[Offset] + request[ChunkStart]);
        for (std::uint32_t index = 0; index < request[ChunkCount]; index++, rng.advanceState())
        {
            State state = {};
            state.advances = request[InitialAdvances] + request[ChunkStart] + index;
            state.ec = rng.next();
            const std::uint32_t sidtid = rng.next();
            state.pid = rng.next();
            if (request[ShinyType] == 1)
            {
                state.shiny = 0;
                if (isShiny(state.pid, tsv)) state.pid ^= 0x10000000U;
            }
            else
            {
                state.shiny = shinyValue(state.pid, static_cast<std::uint16_t>((sidtid >> 16) ^ sidtid));
                if (state.shiny != 0)
                {
                    if (request[Fateful] != 0) state.shiny = 2;
                    if (shinyValue(state.pid, tsv) != state.shiny)
                    {
                        const std::uint16_t high = static_cast<std::uint16_t>(state.pid) ^ tsv ^ (2 - state.shiny);
                        state.pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(state.pid);
                    }
                }
                else if (isShiny(state.pid, tsv)) state.pid ^= 0x10000000U;
            }

            state.ivs.fill(255);
            for (std::uint8_t count = 0; count < request[IvCount];)
            {
                const std::uint8_t ivIndex = static_cast<std::uint8_t>(rng.next(6));
                if (state.ivs[ivIndex] == 255)
                {
                    state.ivs[ivIndex] = 31;
                    count++;
                }
            }
            for (auto &iv : state.ivs)
                if (iv == 255) iv = static_cast<std::uint8_t>(rng.next(32));

            if (request[TemplateAbility] <= 1) state.ability = static_cast<std::uint8_t>(request[TemplateAbility]);
            else if (request[TemplateAbility] == 2)
            {
                state.ability = 2;
                rng.next();
            }
            else state.ability = static_cast<std::uint8_t>(rng.next(2));

            if (personal.gender == 255) state.gender = 2;
            else if (personal.gender == 254) state.gender = 1;
            else if (personal.gender == 0) state.gender = 0;
            else if ((request[Lead] == 25 || request[Lead] == 26) && rng.next(3) > 0)
                state.gender = request[Lead] == 25 ? 0 : 1;
            else state.gender = static_cast<std::uint8_t>(rng.next(253) + 1 < personal.gender);

            state.nature = request[Lead] <= 24 ? static_cast<std::uint8_t>(request[Lead]) : static_cast<std::uint8_t>(rng.next(25));
            state.height = static_cast<std::uint8_t>(rng.next(129) + rng.next(128));
            state.weight = static_cast<std::uint8_t>(rng.next(129) + rng.next(128));
            storeState(request, state, personal);
            if (resultLimitReached) break;
        }
    }

    void generateRoamer(const std::uint32_t *request, std::uint64_t seed0, std::uint64_t seed1)
    {
        const Personal &personal = personalData()[request[Species]];
        const std::uint16_t tsv = static_cast<std::uint16_t>(request[ProfileTid] ^ request[ProfileSid]);
        Xorshift roamer(seed0, seed1, request[InitialAdvances] + request[Offset] + request[ChunkStart]);
        for (std::uint32_t index = 0; index < request[ChunkCount]; index++)
        {
            State state = {};
            state.advances = request[InitialAdvances] + request[ChunkStart] + index;
            state.ec = roamer.frameValue();
            XoroshiroBDSP rng(state.ec);
            const std::uint32_t sidtid = rng.nextUInt(0xffffffffU);
            state.pid = rng.nextUInt(0xffffffffU);
            state.shiny = shinyValue(state.pid, static_cast<std::uint16_t>((sidtid >> 16) ^ sidtid));
            if (state.shiny != 0)
            {
                if (shinyValue(state.pid, tsv) != state.shiny)
                {
                    const std::uint16_t high = static_cast<std::uint16_t>(state.pid) ^ tsv ^ (2 - state.shiny);
                    state.pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(state.pid);
                }
            }
            else if (isShiny(state.pid, tsv)) state.pid ^= 0x10000000U;

            state.ivs.fill(255);
            for (std::uint8_t count = 0; count < 3;)
            {
                const std::uint8_t ivIndex = static_cast<std::uint8_t>(rng.nextUInt(6));
                if (state.ivs[ivIndex] == 255)
                {
                    state.ivs[ivIndex] = 31;
                    count++;
                }
            }
            for (auto &iv : state.ivs)
                if (iv == 255) iv = static_cast<std::uint8_t>(rng.nextUInt(32));
            state.ability = static_cast<std::uint8_t>(rng.nextUInt(2));
            state.gender = request[Species] == 488 ? 1 : 2;
            state.nature = request[Lead] <= 24 ? static_cast<std::uint8_t>(request[Lead]) : static_cast<std::uint8_t>(rng.nextUInt(25));
            state.height = static_cast<std::uint8_t>(rng.nextUInt(129) + rng.nextUInt(128));
            state.weight = static_cast<std::uint8_t>(rng.nextUInt(129) + rng.nextUInt(128));
            storeState(request, state, personal);
            if (resultLimitReached) break;
        }
    }

    void generate(const std::uint32_t *request)
    {
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request[Seed0High]) << 32) | request[Seed0Low];
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request[Seed1High]) << 32) | request[Seed1Low];
        results.clear();
        results.reserve(std::min(request[ResultLimit], request[ChunkCount]));
        processedCount = 0;
        resultLimitReached = false;
        if (request[Roamer] != 0) generateRoamer(request, seed0, seed1);
        else generateNonRoamer(request, seed0, seed1);
    }
}

extern "C"
{
    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_generate(const std::uint32_t *request)
    {
        results.clear();
        processedCount = 0;
        resultLimitReached = false;
        lastError = ErrorCode::None;
        if (request == nullptr || !validRequest(request))
        {
            lastError = ErrorCode::InvalidInput;
            return 0;
        }
        if (request[ChunkStart] >= maximumEvaluations || request[ChunkCount] > maximumEvaluations - request[ChunkStart])
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        generate(request);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uintptr_t gen8static_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_limit_reached()
    {
        return resultLimitReached ? 1U : 0U;
    }

    POKERNGKIT_GEN8STATIC_KEEPALIVE std::uint32_t gen8static_last_error()
    {
        return lastError;
    }
}
