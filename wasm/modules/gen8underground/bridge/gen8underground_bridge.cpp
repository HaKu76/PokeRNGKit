/*
 * PokeRNGKit Gen VIII Underground WebAssembly bridge.
 * Derived from PokeFinder 4.3.2 UndergroundGenerator and UndergroundArea.
 * GPL-3.0-or-later.
 */
#include "gen8underground_bridge.h"

#include <algorithm>
#include <array>
#include <bit>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <limits>
#include <string_view>
#include <vector>

namespace
{
    constexpr std::uint32_t apiVersion = 1;
    constexpr std::uint32_t requestWords = 54;
    constexpr std::uint32_t resultWords = 12;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t allNatures = 0x1ffffff;

    enum ErrorCode : std::uint32_t
    {
        None = 0,
        InvalidRequest = 1,
        RangeTooLarge = 2,
        DataError = 3,
    };

    enum RequestIndex : std::size_t
    {
        Seed0Low = 0,
        Seed0High = 1,
        Seed1Low = 2,
        Seed1High = 3,
        InitialAdvances = 4,
        ChunkStart = 5,
        ChunkCount = 6,
        ProfileTid = 7,
        ProfileSid = 8,
        Version = 9,
        StoryFlag = 10,
        Location = 11,
        Diglett = 12,
        LevelFlag = 13,
        Lead = 14,
        FiltersDisabled = 15,
        ShinyMask = 16,
        GenderFilter = 17,
        AbilityFilter = 18,
        NatureMask = 19,
        HeightMin = 20,
        HeightMax = 21,
        WeightMin = 22,
        WeightMax = 23,
        IvMin = 24,
        IvMax = 30,
        SpeciesMask = 36,
        Offset = 52,
        ResultLimit = 53,
    };

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::array<std::uint8_t, 2> types;
        std::array<std::uint16_t, 3> items;
        std::array<std::uint16_t, 3> abilities;
        std::uint16_t hatchSpecies;
        std::uint8_t gender;
    };

    struct EggMoveData
    {
        std::uint16_t species;
        std::uint8_t count;
        std::array<std::uint16_t, 16> moves;
    };

    struct RawPokemon
    {
        std::uint16_t species;
        std::array<std::uint8_t, 6> flagRates;
        std::uint8_t flag;
        std::uint8_t rateup;
        std::uint8_t size;
    };

    struct SpecialPokemon
    {
        std::uint16_t rate;
        std::uint16_t species;
    };

    struct RawArea
    {
        std::vector<RawPokemon> pokemon;
        std::vector<SpecialPokemon> special;
        std::array<std::uint8_t, 18> typeRates;
        std::uint8_t location;
        std::uint8_t min;
        std::uint8_t max;
    };

    struct Pokemon
    {
        std::uint16_t rate;
        std::uint16_t species;
        std::uint8_t size;
        std::array<std::uint8_t, 2> types;
    };

    struct TypeSize
    {
        std::uint16_t value;
        std::uint8_t size;
        std::uint8_t type;
    };

    struct TypeRate
    {
        std::uint16_t rate;
        std::uint8_t type;
    };

    struct Area
    {
        std::vector<Pokemon> pokemon;
        std::vector<SpecialPokemon> special;
        std::vector<TypeSize> typeSizes;
        std::vector<TypeRate> typeRates;
        std::uint16_t specialSum;
        std::uint16_t typeSum;
        std::uint8_t min;
        std::uint8_t max;
    };

    struct State
    {
        std::uint32_t advances;
        std::uint32_t ec;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::array<std::uint16_t, 6> stats;
        std::uint16_t abilityIndex;
        std::uint16_t eggMove;
        std::uint16_t item;
        std::uint16_t species;
        std::uint8_t ability;
        std::uint8_t characteristic;
        std::uint8_t gender;
        std::uint8_t height;
        std::uint8_t level;
        std::uint8_t nature;
        std::uint8_t shiny;
        std::uint8_t weight;
    };

    struct PackedResult
    {
        std::uint32_t advances;
        std::uint32_t ec;
        std::uint32_t pid;
        std::uint32_t encounter;
        std::uint32_t metadata;
        std::uint32_t ivs0;
        std::uint32_t ivs1;
        std::uint32_t abilityIndex;
        std::uint32_t stats01;
        std::uint32_t stats23;
        std::uint32_t stats45;
        std::uint32_t reserved;
    };

#include "underground_data.inc"

    constexpr std::array<std::array<std::uint8_t, 2>, 9> levelInfo = { {
        { 16, 20 }, { 25, 29 }, { 29, 33 }, { 33, 37 }, { 36, 40 },
        { 39, 43 }, { 42, 46 }, { 50, 55 }, { 58, 63 },
    } };
    constexpr std::array<std::uint16_t, 4> pokemonSizes = { 1, 10, 100, 1000 };
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
            { 0xab586674147dec3eULL, 0xd69063e6e8b0936ULL },
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

    std::uint16_t read16(const std::vector<std::uint8_t> &data, std::size_t offset)
    {
        return static_cast<std::uint16_t>(data[offset]) | (static_cast<std::uint16_t>(data[offset + 1]) << 8);
    }

    const std::array<Personal, 494> &personalData()
    {
        static const std::array<Personal, 494> data = [] {
            std::array<Personal, 494> values = {};
            const auto decoded = decodeBase64(gen8UndergroundPersonalBase64);
            if (decoded.size() != values.size() * 23) return values;
            for (std::size_t species = 0; species < values.size(); species++)
            {
                const std::size_t offset = species * 23;
                for (std::size_t index = 0; index < 6; index++) values[species].stats[index] = decoded[offset + index];
                values[species].types = { decoded[offset + 6], decoded[offset + 7] };
                for (std::size_t index = 0; index < 3; index++)
                {
                    values[species].items[index] = read16(decoded, offset + 8 + index * 2);
                    values[species].abilities[index] = read16(decoded, offset + 15 + index * 2);
                }
                values[species].gender = decoded[offset + 14];
                values[species].hatchSpecies = read16(decoded, offset + 21);
            }
            return values;
        }();
        return data;
    }

    std::array<RawArea, 18> parseAreas(std::string_view encoded)
    {
        std::array<RawArea, 18> areas = {};
        const auto data = decodeBase64(encoded);
        std::size_t offset = 0;
        for (RawArea &area : areas)
        {
            if (offset + 23 > data.size()) return {};
            area.location = data[offset++];
            area.min = data[offset++];
            area.max = data[offset++];
            const std::uint8_t pokemonCount = data[offset++];
            const std::uint8_t specialCount = data[offset++];
            for (auto &rate : area.typeRates) rate = data[offset++];
            if (offset + static_cast<std::size_t>(specialCount) * 4 + static_cast<std::size_t>(pokemonCount) * 12 > data.size())
                return {};
            area.special.reserve(specialCount);
            for (std::uint8_t index = 0; index < specialCount; index++)
            {
                area.special.push_back({ read16(data, offset), read16(data, offset + 2) });
                offset += 4;
            }
            area.pokemon.reserve(pokemonCount);
            for (std::uint8_t index = 0; index < pokemonCount; index++)
            {
                RawPokemon pokemon = {};
                pokemon.species = read16(data, offset);
                offset += 2;
                for (auto &rate : pokemon.flagRates) rate = data[offset++];
                pokemon.flag = data[offset++];
                pokemon.rateup = data[offset++];
                pokemon.size = data[offset++];
                offset++;
                area.pokemon.push_back(pokemon);
            }
        }
        if (offset != data.size()) return {};
        return areas;
    }

    const std::array<RawArea, 18> &rawAreas(std::uint32_t version)
    {
        static const auto bd = parseAreas(gen8UndergroundBdBase64);
        static const auto sp = parseAreas(gen8UndergroundSpBase64);
        return version == 0 ? bd : sp;
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
            for (auto &value : list) value = rng.next();
        }

        std::uint32_t next()
        {
            const std::uint32_t value = list[pointer++];
            pointer &= 255;
            return value;
        }

        std::uint32_t next(std::uint32_t maximum)
        {
            return next() % maximum;
        }

        std::uint32_t nextFrameValue()
        {
            return (next() % 0xffffffffU) + 0x80000000U;
        }

        float nextFloat()
        {
            float maximum;
            const std::uint32_t bits = 0x34000001;
            std::memcpy(&maximum, &bits, sizeof(float));
            return 1.0F - static_cast<float>(next() & 0x7fffffU) * maximum;
        }

        void advanceState()
        {
            list[head++] = rng.next();
            pointer = head;
        }

    private:
        Xorshift rng;
        std::array<std::uint32_t, 256> list = {};
        std::uint8_t head = 0;
        std::uint8_t pointer = 0;
    };

    Area prepareArea(const RawArea &raw, std::uint8_t storyFlag, bool diglett)
    {
        Area area = {};
        const auto &personal = personalData();
        area.min = raw.min;
        area.max = raw.max;
        area.special = raw.special;
        for (std::size_t index = 1; index < area.special.size(); index++) area.special[index].rate += area.special[index - 1].rate;
        area.specialSum = area.special.empty() ? 0 : area.special.back().rate;

        for (const auto &entry : raw.pokemon)
        {
            if (entry.flag > storyFlag || entry.species >= personal.size()) continue;
            const Personal &info = personal[entry.species];
            const std::uint16_t rate = static_cast<std::uint16_t>(
                entry.flagRates[storyFlag - 1] * (diglett ? entry.rateup : 1));
            area.pokemon.push_back({ rate, entry.species, entry.size, info.types });
            const std::uint8_t typeCount = info.types[0] == info.types[1] ? 1 : 2;
            for (std::uint8_t index = 0; index < typeCount; index++)
                area.typeSizes.push_back({ static_cast<std::uint16_t>(pokemonSizes[entry.size] + info.types[index]), entry.size,
                                           info.types[index] });
        }

        for (std::uint8_t type = 0; type < raw.typeRates.size(); type++)
        {
            if (std::ranges::find_if(area.typeSizes, [type](const TypeSize &value) { return value.type == type; })
                == area.typeSizes.end())
                continue;
            area.typeSum += raw.typeRates[type];
            area.typeRates.push_back({ raw.typeRates[type], type });
        }
        std::ranges::sort(area.typeRates, [](const TypeRate &left, const TypeRate &right) { return left.rate > right.rate; });
        for (std::size_t index = 1; index < area.typeRates.size(); index++) area.typeRates[index].rate += area.typeRates[index - 1].rate;
        return area;
    }

    std::uint16_t specialPokemon(FrameRng &rng, const Area &area)
    {
        if (area.special.empty() || rng.next(100) >= 50) return 0;
        const float rate = rng.nextFloat() * area.specialSum;
        const auto entry = std::ranges::find_if(area.special, [rate](const SpecialPokemon &value) { return rate < value.rate; });
        return entry == area.special.end() ? 0 : entry->species;
    }

    std::vector<TypeSize> slots(FrameRng &rng, const Area &area, std::uint8_t count)
    {
        std::vector<TypeSize> values;
        values.reserve(count);
        for (std::uint8_t index = 0; index < count; index++)
        {
            std::uint8_t type = 0;
            const float rate = rng.nextFloat() * area.typeSum;
            const auto typeRate = std::ranges::find_if(area.typeRates, [rate](const TypeRate &value) { return rate < value.rate; });
            if (typeRate != area.typeRates.end()) type = typeRate->type;

            std::array<std::uint8_t, 3> sizes = {};
            std::uint8_t sizeCount = 0;
            for (const auto &entry : area.typeSizes)
            {
                if (entry.type == type
                    && std::find(sizes.begin(), sizes.begin() + sizeCount, entry.size) == sizes.begin() + sizeCount)
                    sizes[sizeCount++] = entry.size;
            }
            const std::uint8_t size = sizes[rng.next(sizeCount)];
            values.push_back({ static_cast<std::uint16_t>(pokemonSizes[size] + type), size, type });
        }
        return values;
    }

    std::uint16_t pokemon(FrameRng &rng, const Area &area, const TypeSize &slot)
    {
        std::vector<TypeSize> matchingTypes;
        for (const auto &entry : area.typeSizes)
            if (entry.value == slot.value) matchingTypes.push_back(entry);

        std::vector<Pokemon> matchingPokemon;
        std::uint16_t sum = 0;
        for (const auto &entry : area.pokemon)
        {
            const bool matches = std::ranges::find_if(matchingTypes, [&entry](const TypeSize &type) {
                                     return type.size == entry.size && (type.type == entry.types[0] || type.type == entry.types[1]);
                                 })
                != matchingTypes.end();
            if (!matches) continue;
            sum += entry.rate;
            matchingPokemon.push_back(entry);
        }
        std::ranges::sort(matchingPokemon, [](const Pokemon &left, const Pokemon &right) { return left.rate > right.rate; });
        float rate = rng.nextFloat() * sum;
        for (const auto &entry : matchingPokemon)
        {
            if (rate < entry.rate) return entry.species;
            rate -= entry.rate;
        }
        return 0;
    }

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ pid);
        if (tsv == psv) return 2;
        return (tsv ^ psv) < 16 ? 1 : 0;
    }

    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ pid);
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

    std::array<std::uint16_t, 6> calculateStats(
        const Personal &personal, const std::array<std::uint8_t, 6> &ivs, std::uint8_t nature, std::uint8_t level)
    {
        constexpr std::array<std::uint8_t, 5> natureMap = { 1, 2, 5, 3, 4 };
        const std::uint8_t raised = natureMap[nature / 5];
        const std::uint8_t lowered = natureMap[nature % 5];
        std::array<std::uint16_t, 6> values = {};
        for (std::size_t index = 0; index < values.size(); index++)
        {
            const std::uint32_t scaled = ((2U * personal.stats[index] + ivs[index]) * level) / 100;
            if (index == 0) values[index] = static_cast<std::uint16_t>(scaled + level + 10);
            else
            {
                const std::uint32_t raw = scaled + 5;
                values[index] = static_cast<std::uint16_t>(
                    raised == lowered ? raw : index == raised ? raw * 11 / 10 : index == lowered ? raw * 9 / 10 : raw);
            }
        }
        return values;
    }

    std::uint16_t item(std::uint8_t value, std::uint8_t lead, const Personal &personal)
    {
        const std::uint8_t first = lead == 34 ? 60 : 50;
        if (value >= first) return value >= first + 20 ? personal.items[2] : personal.items[1];
        return personal.items[0];
    }

    std::uint16_t eggMove(FrameRng &rng, std::uint16_t hatchSpecies)
    {
        const auto entry = std::lower_bound(
            gen8UndergroundEggMoves.begin(), gen8UndergroundEggMoves.end(), hatchSpecies,
            [](const EggMoveData &moves, std::uint16_t species) { return moves.species < species; });
        return entry == gen8UndergroundEggMoves.end() || entry->species != hatchSpecies
            ? 0
            : entry->moves[rng.next(entry->count)];
    }

    State createPokemon(
        const std::uint32_t *request, FrameRng &rng, std::uint32_t advances, std::uint16_t species)
    {
        const Personal &personal = personalData()[species];
        const auto levels = levelInfo[request[LevelFlag]];
        State state = {};
        state.advances = request[InitialAdvances] + advances;
        state.species = species;
        state.level = request[Lead] == 32
            ? levels[1]
            : static_cast<std::uint8_t>(levels[0] + rng.next(levels[1] - levels[0] + 1));
        state.ec = rng.nextFrameValue();
        const std::uint32_t sidtid = rng.nextFrameValue();
        const std::uint16_t fakeTsv = static_cast<std::uint16_t>((sidtid >> 16) ^ sidtid);
        const std::uint16_t profileTsv = static_cast<std::uint16_t>(request[ProfileTid] ^ request[ProfileSid]);
        const std::uint8_t pidRolls = request[Diglett] == 0 ? 1 : 2;
        for (std::uint8_t index = 0; index < pidRolls; index++)
        {
            state.pid = rng.nextFrameValue();
            state.shiny = shinyValue(state.pid, fakeTsv);
            if (state.shiny != 0)
            {
                if (shinyValue(state.pid, profileTsv) != state.shiny)
                {
                    const std::uint16_t high = static_cast<std::uint16_t>(state.pid) ^ profileTsv ^ (2 - state.shiny);
                    state.pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(state.pid);
                }
                break;
            }
            if (isShiny(state.pid, profileTsv)) state.pid ^= 0x10000000U;
        }
        for (auto &iv : state.ivs) iv = static_cast<std::uint8_t>(rng.nextFrameValue() % 32);
        state.ability = static_cast<std::uint8_t>(rng.nextFrameValue() % 2);
        if (personal.gender == 255) state.gender = 2;
        else if (personal.gender == 254) state.gender = 1;
        else if (personal.gender == 0) state.gender = 0;
        else if ((request[Lead] == 25 || request[Lead] == 26) && rng.next(100) < 67)
            state.gender = request[Lead] == 25 ? 0 : 1;
        else state.gender = static_cast<std::uint8_t>((rng.nextFrameValue() % 253) + 1 < personal.gender);
        state.nature = request[Lead] <= 24 ? static_cast<std::uint8_t>(request[Lead])
                                          : static_cast<std::uint8_t>(rng.nextFrameValue() % 25);
        state.height = static_cast<std::uint8_t>(rng.nextFrameValue() % 129 + rng.nextFrameValue() % 128);
        state.weight = static_cast<std::uint8_t>(rng.nextFrameValue() % 129 + rng.nextFrameValue() % 128);
        state.item = item(static_cast<std::uint8_t>(rng.next(100)), static_cast<std::uint8_t>(request[Lead]), personal);
        state.eggMove = eggMove(rng, personal.hatchSpecies);
        state.characteristic = characteristic(state.ec, state.ivs);
        state.abilityIndex = personal.abilities[state.ability];
        state.stats = calculateStats(personal, state.ivs, state.nature, state.level);
        return state;
    }

    bool speciesSelected(const std::uint32_t *request, std::uint16_t species)
    {
        return (request[SpeciesMask + species / 32] & (1U << (species % 32))) != 0;
    }

    bool passesFilter(const std::uint32_t *request, const State &state)
    {
        if (request[FiltersDisabled] != 0) return true;
        if (request[AbilityFilter] != 255 && request[AbilityFilter] != state.ability) return false;
        if (request[GenderFilter] != 255 && request[GenderFilter] != state.gender) return false;
        if ((request[NatureMask] & (1U << state.nature)) == 0) return false;
        if (state.height < request[HeightMin] || state.height > request[HeightMax]) return false;
        if (state.weight < request[WeightMin] || state.weight > request[WeightMax]) return false;
        if (!speciesSelected(request, state.species)) return false;
        if ((request[ShinyMask] & (1U << state.shiny)) == 0) return false;
        for (std::size_t index = 0; index < 6; index++)
            if (state.ivs[index] < request[IvMin + index] || state.ivs[index] > request[IvMax + index]) return false;
        return true;
    }

    std::uint32_t packBytes(const std::array<std::uint8_t, 6> &values, std::size_t offset)
    {
        std::uint32_t packed = 0;
        const std::size_t count = std::min<std::size_t>(4, values.size() - offset);
        for (std::size_t index = 0; index < count; index++) packed |= static_cast<std::uint32_t>(values[offset + index]) << (index * 8);
        return packed;
    }

    std::uint32_t packStats(const std::array<std::uint16_t, 6> &values, std::size_t offset)
    {
        return values[offset] | (static_cast<std::uint32_t>(values[offset + 1]) << 16);
    }

    PackedResult pack(const State &state)
    {
        const std::uint32_t encounter = state.eggMove | (static_cast<std::uint32_t>(state.item) << 16);
        const std::uint32_t metadata = state.species | (static_cast<std::uint32_t>(state.level) << 10)
            | (static_cast<std::uint32_t>(state.ability) << 17) | (static_cast<std::uint32_t>(state.gender) << 19)
            | (static_cast<std::uint32_t>(state.nature) << 21) | (static_cast<std::uint32_t>(state.shiny) << 26);
        const std::uint32_t measures = state.height | (static_cast<std::uint32_t>(state.weight) << 8)
            | (static_cast<std::uint32_t>(state.characteristic) << 16);
        return { state.advances, state.ec, state.pid, encounter, metadata, packBytes(state.ivs, 0), packBytes(state.ivs, 4),
                 state.abilityIndex, packStats(state.stats, 0), packStats(state.stats, 2), packStats(state.stats, 4), measures };
    }

    bool validLead(std::uint32_t lead)
    {
        return lead <= 26 || lead == 32 || lead == 34 || lead == 255;
    }

    bool validRequest(const std::uint32_t *request)
    {
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request[Seed0High]) << 32) | request[Seed0Low];
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request[Seed1High]) << 32) | request[Seed1Low];
        if ((seed0 == 0 && seed1 == 0) || request[ChunkCount] == 0) return false;
        const std::uint64_t lastAdvance
            = static_cast<std::uint64_t>(request[InitialAdvances]) + request[ChunkStart] + request[ChunkCount] - 1;
        const std::uint64_t rngAdvance = lastAdvance + request[Offset];
        if (lastAdvance > std::numeric_limits<std::uint32_t>::max()
            || rngAdvance > std::numeric_limits<std::uint32_t>::max())
            return false;
        const bool validGender = request[GenderFilter] <= 2 || request[GenderFilter] == 255;
        const bool validAbility = request[AbilityFilter] <= 1 || request[AbilityFilter] == 255;
        if (request[ProfileTid] > 0xffff || request[ProfileSid] > 0xffff || request[Version] > 1
            || request[StoryFlag] < 1 || request[StoryFlag] > 6 || request[Location] < 2 || request[Location] > 19
            || request[Diglett] > 1 || request[LevelFlag] > 8 || !validLead(request[Lead]) || request[FiltersDisabled] > 1
            || request[ShinyMask] == 0 || !validGender || !validAbility || request[NatureMask] == 0
            || (request[NatureMask] & ~allNatures) != 0 || request[HeightMin] > request[HeightMax]
            || request[HeightMax] > 255 || request[WeightMin] > request[WeightMax] || request[WeightMax] > 255
            || request[ResultLimit] == 0 || request[ResultLimit] > maximumResults)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request[IvMin + index] > request[IvMax + index] || request[IvMax + index] > 31) return false;
        return true;
    }

    bool validData(const RawArea &area, std::uint32_t location)
    {
        return area.location == location && !area.pokemon.empty() && !area.special.empty() && area.min > 0 && area.max <= 10
            && area.min <= area.max;
    }

    void append(const std::uint32_t *request, const State &state)
    {
        if (!passesFilter(request, state)) return;
        results.push_back(pack(state));
        if (results.size() >= request[ResultLimit]) resultLimitReached = true;
    }

    void generate(const std::uint32_t *request)
    {
        const auto &raw = rawAreas(request[Version])[request[Location] - 2];
        if (!validData(raw, request[Location]))
        {
            lastError = ErrorCode::DataError;
            return;
        }
        const Area area = prepareArea(raw, static_cast<std::uint8_t>(request[StoryFlag]), request[Diglett] != 0);
        if (area.pokemon.empty() || area.typeRates.empty() || area.typeSizes.empty())
        {
            lastError = ErrorCode::DataError;
            return;
        }
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request[Seed0High]) << 32) | request[Seed0Low];
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request[Seed1High]) << 32) | request[Seed1Low];
        FrameRng rng(seed0, seed1, request[InitialAdvances] + request[Offset] + request[ChunkStart]);
        for (std::uint32_t index = 0; index < request[ChunkCount]; index++, rng.advanceState())
        {
            std::uint8_t spawnCount = area.min;
            const std::uint16_t special = specialPokemon(rng, area);
            if (rng.next(100) >= 50) spawnCount = area.max;
            if (special != 0) spawnCount--;
            const auto selectedSlots = slots(rng, area, spawnCount);
            for (const auto &slot : selectedSlots)
            {
                const std::uint16_t species = pokemon(rng, area, slot);
                if (species == 0)
                {
                    lastError = ErrorCode::DataError;
                    return;
                }
                append(request, createPokemon(request, rng, request[ChunkStart] + index, species));
                if (resultLimitReached) break;
            }
            if (!resultLimitReached && special != 0)
                append(request, createPokemon(request, rng, request[ChunkStart] + index, special));
            processedCount++;
            if (resultLimitReached) break;
        }
    }
}

extern "C"
{
    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_generate(const std::uint32_t *request)
    {
        results.clear();
        processedCount = 0;
        resultLimitReached = false;
        lastError = ErrorCode::None;
        if (request == nullptr || !validRequest(request))
        {
            lastError = ErrorCode::InvalidRequest;
            return 0;
        }
        if (request[ChunkCount] > 250000000)
        {
            lastError = ErrorCode::RangeTooLarge;
            return 0;
        }
        results.reserve(request[ResultLimit]);
        generate(request);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uintptr_t gen8underground_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_limit_reached()
    {
        return resultLimitReached ? 1 : 0;
    }

    POKERNGKIT_GEN8UNDERGROUND_KEEPALIVE std::uint32_t gen8underground_last_error()
    {
        return lastError;
    }
}

static_assert(sizeof(PackedResult) == resultWords * sizeof(std::uint32_t));
static_assert(requestWords == 54);
