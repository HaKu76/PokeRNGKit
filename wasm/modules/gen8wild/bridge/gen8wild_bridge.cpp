/*
 * PokeRNGKit Gen VIII Wild WebAssembly bridge.
 * Derived from PokeFinder 4.3.2 WildGenerator8, EncounterArea8, and Encounters8.
 * GPL-3.0-or-later.
 */
#include "gen8wild_bridge.h"

#include <algorithm>
#include <array>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <string_view>
#include <vector>

namespace
{
    constexpr std::uint32_t apiVersion = 2;
    constexpr std::uint32_t requestWords = 50;
    constexpr std::uint32_t resultWords = 12;
    constexpr std::uint32_t maximumResults = 100000;
    constexpr std::uint32_t allNatures = 0x1ffffff;
    constexpr std::uint32_t allHiddenPowers = 0xffff;

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
        Encounter = 10,
        Location = 11,
        Time = 12,
        Radar = 13,
        Swarm = 14,
        Replacement0 = 15,
        Replacement1 = 16,
        FeebasTile = 17,
        Lead = 18,
        HoneyIndex = 19,
        FiltersDisabled = 20,
        ShinyFilter = 21,
        GenderFilter = 22,
        AbilityFilter = 23,
        NatureMask = 24,
        HiddenPowerMask = 25,
        SlotMask = 26,
        LevelMin = 27,
        LevelMax = 28,
        HeightMin = 29,
        HeightMax = 30,
        WeightMin = 31,
        WeightMax = 32,
        IvMin = 33,
        IvMax = 39,
        PerfectIvValue = 45,
        PerfectIvCount = 46,
        Offset = 47,
        ResultLimit = 48,
        NationalDex = 49,
    };

    enum EncounterType : std::uint8_t
    {
        Grass = 0,
        HoneyTree = 1,
        RockSmash = 2,
        Surfing = 3,
        OldRod = 4,
        GoodRod = 5,
        SuperRod = 6,
    };

    struct RawSlot
    {
        std::uint16_t species;
        std::uint8_t minLevel;
        std::uint8_t maxLevel;
    };

    struct RawArea
    {
        std::uint8_t location;
        std::array<std::uint8_t, 5> rates;
        std::array<RawSlot, 32> slots;
        std::array<std::uint16_t, 2> swarm;
        std::array<std::uint16_t, 2> day;
        std::array<std::uint16_t, 2> night;
        std::array<std::uint16_t, 4> radar;
    };

    struct RawHoneyArea
    {
        std::uint8_t location;
        std::array<RawSlot, 18> slots;
    };

    struct Personal
    {
        std::array<std::uint8_t, 6> stats;
        std::array<std::uint8_t, 2> types;
        std::array<std::uint16_t, 3> items;
        std::array<std::uint16_t, 3> abilities;
        std::uint8_t gender;
    };

    struct Area
    {
        std::array<RawSlot, 12> slots;
        std::uint8_t count;
        std::uint8_t location;
        std::uint8_t encounter;
    };

    struct State
    {
        std::uint32_t advances;
        std::uint32_t ec;
        std::uint32_t pid;
        std::array<std::uint8_t, 6> ivs;
        std::array<std::uint16_t, 6> stats;
        std::uint16_t abilityIndex;
        std::uint16_t item;
        std::uint16_t species;
        std::uint8_t ability;
        std::uint8_t characteristic;
        std::uint8_t encounterSlot;
        std::uint8_t form;
        std::uint8_t gender;
        std::uint8_t height;
        std::uint8_t hiddenPower;
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
        std::uint32_t measures;
    };

#include "wild_data.inc"

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
            const auto decoded = decodeBase64(gen8WildPersonalBase64);
            if (decoded.size() != values.size() * 21) return values;
            for (std::size_t species = 0; species < values.size(); species++)
            {
                const std::size_t offset = species * 21;
                for (std::size_t index = 0; index < 6; index++) values[species].stats[index] = decoded[offset + index];
                values[species].types = { decoded[offset + 6], decoded[offset + 7] };
                for (std::size_t index = 0; index < 3; index++)
                {
                    values[species].items[index] = read16(decoded, offset + 8 + index * 2);
                    values[species].abilities[index] = read16(decoded, offset + 15 + index * 2);
                }
                values[species].gender = decoded[offset + 14];
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
            pointer &= 127;
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

        void advance(std::uint32_t amount)
        {
            pointer = static_cast<std::uint8_t>((pointer + amount) & 127);
        }

        void advanceState()
        {
            list[head++] = rng.next();
            head &= 127;
            pointer = head;
        }

    private:
        Xorshift rng;
        std::array<std::uint32_t, 128> list = {};
        std::uint8_t head = 0;
        std::uint8_t pointer = 0;
    };

    const RawArea *findRawArea(std::uint32_t version, std::uint32_t location)
    {
        const auto &areas = version == 0 ? gen8WildBdAreas : gen8WildSpAreas;
        const auto entry = std::find_if(areas.begin(), areas.end(), [location](const RawArea &area) {
            return area.location == location;
        });
        return entry == areas.end() ? nullptr : &*entry;
    }

    const RawHoneyArea *findRawHoney(std::uint32_t version, std::uint32_t location)
    {
        const auto &areas = version == 0 ? gen8WildBdHoney : gen8WildSpHoney;
        const auto entry = std::find_if(areas.begin(), areas.end(), [location](const RawHoneyArea &area) {
            return area.location == location;
        });
        return entry == areas.end() ? nullptr : &*entry;
    }

    bool contains(const auto &values, std::uint32_t value)
    {
        return std::find(values.begin(), values.end(), value) != values.end();
    }

    std::uint8_t honeyTreeId(std::uint8_t location)
    {
        const auto entry = std::find(gen8WildHoneyLocations.begin(), gen8WildHoneyLocations.end(), location);
        return entry == gen8WildHoneyLocations.end()
            ? 255
            : static_cast<std::uint8_t>(std::distance(gen8WildHoneyLocations.begin(), entry));
    }

    Area prepareHoneyArea(const std::uint32_t *request)
    {
        Area area = {};
        const RawHoneyArea *raw = findRawHoney(request[Version], request[Location]);
        if (raw == nullptr) return area;
        std::array<std::uint8_t, 4> munchlax = {
            static_cast<std::uint8_t>(((request[ProfileSid] >> 8) & 0xffU) % 21),
            static_cast<std::uint8_t>((request[ProfileSid] & 0xffU) % 21),
            static_cast<std::uint8_t>(((request[ProfileTid] >> 8) & 0xffU) % 21),
            static_cast<std::uint8_t>((request[ProfileTid] & 0xffU) % 21),
        };
        for (std::size_t index = 1; index < munchlax.size(); index++)
            for (std::size_t previous = 0; previous < index; previous++)
                if (munchlax[index] == munchlax[previous]) munchlax[index] = (munchlax[index] + 1) % 21;

        const std::uint8_t tree = honeyTreeId(raw->location);
        const std::size_t maximum = contains(munchlax, tree) ? 18 : 12;
        for (std::size_t index = 0; index < maximum; index++)
        {
            const RawSlot slot = raw->slots[index];
            const bool duplicate = std::find_if(area.slots.begin(), area.slots.begin() + area.count, [slot](const RawSlot &value) {
                                       return value.species == slot.species;
                                   })
                != area.slots.begin() + area.count;
            if (!duplicate) area.slots[area.count++] = slot;
        }
        area.location = raw->location;
        area.encounter = HoneyTree;
        return area;
    }

    void replaceSpecies(RawSlot &slot, std::uint16_t species)
    {
        if (species != 0) slot.species = species;
    }

    Area prepareArea(const std::uint32_t *request)
    {
        if (request[Encounter] == HoneyTree) return prepareHoneyArea(request);
        Area area = {};
        const RawArea *raw = findRawArea(request[Version], request[Location]);
        if (raw == nullptr || request[Encounter] == RockSmash) return area;

        std::size_t sourceOffset = 0;
        std::size_t count = 12;
        std::size_t rateIndex = 0;
        switch (request[Encounter])
        {
        case Grass:
            break;
        case Surfing:
            sourceOffset = 12;
            count = 5;
            rateIndex = 1;
            break;
        case OldRod:
            sourceOffset = 17;
            count = 5;
            rateIndex = 2;
            break;
        case GoodRod:
            sourceOffset = 22;
            count = 5;
            rateIndex = 3;
            break;
        case SuperRod:
            sourceOffset = 27;
            count = 5;
            rateIndex = 4;
            break;
        default:
            return area;
        }
        if (raw->rates[rateIndex] == 0) return area;
        for (std::size_t index = 0; index < count; index++) area.slots[index] = raw->slots[sourceOffset + index];
        area.count = static_cast<std::uint8_t>(count);

        if (request[Encounter] == Grass)
        {
            if (request[Swarm] != 0)
            {
                replaceSpecies(area.slots[0], raw->swarm[0]);
                replaceSpecies(area.slots[1], raw->swarm[1]);
            }
            if (request[Time] == 1)
            {
                replaceSpecies(area.slots[2], raw->day[0]);
                replaceSpecies(area.slots[3], raw->day[1]);
            }
            else if (request[Time] == 2)
            {
                replaceSpecies(area.slots[2], raw->night[0]);
                replaceSpecies(area.slots[3], raw->night[1]);
            }
            if (request[Radar] != 0)
            {
                replaceSpecies(area.slots[4], raw->radar[0]);
                replaceSpecies(area.slots[5], raw->radar[1]);
                replaceSpecies(area.slots[10], raw->radar[2]);
                replaceSpecies(area.slots[11], raw->radar[3]);
            }
            if (raw->location >= 23 && raw->location <= 28 && request[Replacement0] != 0)
            {
                replaceSpecies(area.slots[6], static_cast<std::uint16_t>(request[Replacement0]));
                replaceSpecies(area.slots[7], static_cast<std::uint16_t>(request[Replacement0]));
            }
            if (raw->location == 117 && request[Replacement0] != 0 && request[Replacement1] != 0)
            {
                replaceSpecies(area.slots[6], static_cast<std::uint16_t>(request[Replacement0]));
                replaceSpecies(area.slots[7], static_cast<std::uint16_t>(request[Replacement1]));
            }
        }
        else if (raw->location == 22 && request[FeebasTile] != 0)
        {
            area.slots[5] = { 349, 10, 20 };
            area.count = 6;
        }
        area.location = raw->location;
        area.encounter = static_cast<std::uint8_t>(request[Encounter]);
        return area;
    }

    std::uint8_t encounterSlot(std::uint32_t value, std::uint8_t encounter)
    {
        constexpr std::array<std::uint8_t, 12> grass = { 20, 40, 50, 60, 70, 80, 85, 90, 94, 98, 99, 100 };
        constexpr std::array<std::uint8_t, 5> surf = { 60, 90, 95, 99, 100 };
        constexpr std::array<std::uint8_t, 5> fish = { 40, 80, 95, 99, 100 };
        const auto &thresholds = encounter == GoodRod || encounter == SuperRod ? fish : surf;
        if (encounter == Grass)
        {
            for (std::uint8_t index = 0; index < grass.size(); index++)
                if (value < grass[index]) return index;
            return 11;
        }
        for (std::uint8_t index = 0; index < thresholds.size(); index++)
            if (value < thresholds[index]) return index;
        return 4;
    }

    std::vector<std::uint8_t> modifiedSlots(const Area &area, std::uint32_t lead)
    {
        std::uint8_t type = 255;
        if (lead == 27) type = 8;
        else if (lead == 28) type = 12;
        else if (lead == 29) type = 11;
        else if (lead == 30) type = 9;
        else if (lead == 31) type = 10;
        if (type == 255) return {};

        const auto &personal = personalData();
        std::vector<std::uint8_t> values;
        for (std::uint8_t index = 0; index < area.count; index++)
        {
            const std::uint16_t species = area.slots[index].species;
            if (species >= personal.size()) continue;
            const auto types = personal[species].types;
            if (types[0] == type || types[1] == type) values.push_back(index);
        }
        if (values.size() == area.count) values.clear();
        return values;
    }

    std::uint8_t level(FrameRng &rng, const Area &area, std::uint8_t slot, bool pressure)
    {
        const RawSlot &selected = area.slots[slot];
        if (area.encounter == Grass)
        {
            std::uint8_t value = selected.maxLevel;
            if (pressure && rng.next(2) != 0)
                for (std::uint8_t index = 0; index < area.count; index++)
                    if (area.slots[index].species == selected.species) value = std::max(value, area.slots[index].maxLevel);
            return value;
        }
        const std::uint8_t random = static_cast<std::uint8_t>(rng.next(selected.maxLevel - selected.minLevel + 1));
        if (pressure && rng.next(2) != 0) return selected.maxLevel;
        return selected.minLevel + random;
    }

    std::uint8_t unownForm(std::uint8_t location, std::uint32_t value)
    {
        constexpr std::array<std::uint8_t, 20> forms0 = { 0, 1, 2, 6, 7, 9, 10, 11, 12, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25 };
        constexpr std::array<std::uint8_t, 2> forms7 = { 26, 27 };
        switch (location)
        {
        case 29:
            return forms7[value % forms7.size()];
        case 30:
            return forms0[value % forms0.size()];
        case 32:
            return 5;
        case 34:
            return 17;
        case 40:
            return 8;
        case 41:
            return 13;
        case 42:
            return 4;
        case 43:
            return 3;
        default:
            return 0;
        }
    }

    std::uint8_t shinyValue(std::uint32_t pid, std::uint16_t tsv)
    {
        const std::uint16_t psv = static_cast<std::uint16_t>((pid >> 16) ^ pid);
        if (tsv == psv) return 2;
        return (tsv ^ psv) < 16 ? 1 : 0;
    }

    bool isShiny(std::uint32_t pid, std::uint16_t tsv)
    {
        return (static_cast<std::uint16_t>((pid >> 16) ^ pid) ^ tsv) < 16;
    }

    std::uint8_t hiddenPower(const std::array<std::uint8_t, 6> &ivs)
    {
        constexpr std::array<std::uint8_t, 6> order = { 0, 1, 2, 5, 3, 4 };
        std::uint8_t value = 0;
        for (std::uint8_t index = 0; index < 6; index++) value |= (ivs[order[index]] & 1U) << index;
        return value * 15 / 63;
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
        const Personal &personal, const std::array<std::uint8_t, 6> &ivs, std::uint8_t nature, std::uint8_t levelValue)
    {
        constexpr std::array<std::uint8_t, 5> natureMap = { 1, 2, 5, 3, 4 };
        const std::uint8_t raised = natureMap[nature / 5];
        const std::uint8_t lowered = natureMap[nature % 5];
        std::array<std::uint16_t, 6> values = {};
        for (std::size_t index = 0; index < values.size(); index++)
        {
            const std::uint32_t scaled = ((2U * personal.stats[index] + ivs[index]) * levelValue) / 100;
            if (index == 0) values[index] = static_cast<std::uint16_t>(scaled + levelValue + 10);
            else
            {
                const std::uint32_t raw = scaled + 5;
                values[index] = static_cast<std::uint16_t>(
                    raised == lowered ? raw : index == raised ? raw * 11 / 10 : index == lowered ? raw * 9 / 10 : raw);
            }
        }
        return values;
    }

    std::uint16_t item(std::uint8_t value, std::uint32_t lead, const Personal &personal)
    {
        const std::uint8_t first = lead == 34 ? 60 : 50;
        if (value >= first) return value >= first + (lead == 34 ? 20 : 5) ? personal.items[2] : personal.items[1];
        return personal.items[0];
    }

    State createState(
        const std::uint32_t *request, FrameRng &rng, const Area &area, std::uint32_t advances, std::uint8_t slot,
        std::uint8_t levelValue, bool cuteCharm, std::uint8_t form, bool honey)
    {
        const RawSlot &selected = area.slots[slot];
        const Personal &personal = personalData()[selected.species];
        State state = {};
        state.advances = request[InitialAdvances] + advances;
        state.encounterSlot = slot;
        state.species = selected.species;
        state.level = levelValue;
        state.form = form;
        state.ec = rng.nextFrameValue();
        const std::uint32_t sidtid = rng.nextFrameValue();
        state.pid = rng.nextFrameValue();
        const std::uint16_t fakeTsv = static_cast<std::uint16_t>((sidtid >> 16) ^ sidtid);
        const std::uint16_t profileTsv = static_cast<std::uint16_t>(request[ProfileTid] ^ request[ProfileSid]);
        state.shiny = shinyValue(state.pid, fakeTsv);
        if (state.shiny != 0)
        {
            if (shinyValue(state.pid, profileTsv) != state.shiny)
            {
                const std::uint16_t high = static_cast<std::uint16_t>(state.pid) ^ profileTsv ^ (2 - state.shiny);
                state.pid = (static_cast<std::uint32_t>(high) << 16) | static_cast<std::uint16_t>(state.pid);
            }
        }
        else if (isShiny(state.pid, profileTsv)) state.pid ^= 0x10000000U;
        for (auto &iv : state.ivs) iv = static_cast<std::uint8_t>(rng.nextFrameValue() % 32);
        state.ability = static_cast<std::uint8_t>(rng.nextFrameValue() % 2);
        if (personal.gender == 255) state.gender = 2;
        else if (personal.gender == 254) state.gender = 1;
        else if (personal.gender == 0) state.gender = 0;
        else if (cuteCharm) state.gender = request[Lead] == 25 ? 0 : 1;
        else state.gender = static_cast<std::uint8_t>((rng.nextFrameValue() % 253) + 1 < personal.gender);
        state.nature = request[Lead] <= 24 ? static_cast<std::uint8_t>(request[Lead])
                                          : static_cast<std::uint8_t>(rng.nextFrameValue() % 25);
        state.height = static_cast<std::uint8_t>(rng.nextFrameValue() % 129 + rng.nextFrameValue() % 128);
        state.weight = static_cast<std::uint8_t>(rng.nextFrameValue() % 129 + rng.nextFrameValue() % 128);
        state.item = honey ? personal.items[0] : item(static_cast<std::uint8_t>(rng.next(100)), request[Lead], personal);
        state.hiddenPower = hiddenPower(state.ivs);
        state.characteristic = characteristic(state.ec, state.ivs);
        state.abilityIndex = personal.abilities[state.ability];
        state.stats = calculateStats(personal, state.ivs, state.nature, state.level);
        return state;
    }

    bool slotSelected(const std::uint32_t *request, std::uint8_t slot)
    {
        return request[FiltersDisabled] != 0 || (request[SlotMask] & (1U << slot)) != 0;
    }

    bool passesFilter(const std::uint32_t *request, const State &state)
    {
        if (request[FiltersDisabled] != 0) return true;
        if (request[AbilityFilter] != 255 && request[AbilityFilter] != state.ability) return false;
        if (request[GenderFilter] != 255 && request[GenderFilter] != state.gender) return false;
        if ((request[NatureMask] & (1U << state.nature)) == 0) return false;
        if ((request[HiddenPowerMask] & (1U << state.hiddenPower)) == 0) return false;
        if (request[ShinyFilter] != 255 && (request[ShinyFilter] & state.shiny) == 0) return false;
        if (state.level < request[LevelMin] || state.level > request[LevelMax]) return false;
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
        for (std::size_t index = 0; index < count; index++) packed |= static_cast<std::uint32_t>(values[offset + index]) << (index * 8);
        return packed;
    }

    std::uint32_t packStats(const std::array<std::uint16_t, 6> &values, std::size_t offset)
    {
        return values[offset] | (static_cast<std::uint32_t>(values[offset + 1]) << 16);
    }

    PackedResult pack(const State &state)
    {
        const std::uint32_t encounter = state.item | (static_cast<std::uint32_t>(state.species) << 16);
        const std::uint32_t metadata = state.level | (static_cast<std::uint32_t>(state.ability) << 7)
            | (static_cast<std::uint32_t>(state.gender) << 9) | (static_cast<std::uint32_t>(state.nature) << 11)
            | (static_cast<std::uint32_t>(state.shiny) << 16) | (static_cast<std::uint32_t>(state.encounterSlot) << 18)
            | (static_cast<std::uint32_t>(state.form) << 22);
        const std::uint32_t measures = state.height | (static_cast<std::uint32_t>(state.weight) << 8)
            | (static_cast<std::uint32_t>(state.characteristic) << 16)
            | (static_cast<std::uint32_t>(state.hiddenPower) << 21);
        return { state.advances, state.ec, state.pid, encounter, metadata, packBytes(state.ivs, 0), packBytes(state.ivs, 4),
                 state.abilityIndex, packStats(state.stats, 0), packStats(state.stats, 2), packStats(state.stats, 4), measures };
    }

    void append(const std::uint32_t *request, const State &state)
    {
        if (!passesFilter(request, state)) return;
        results.push_back(pack(state));
        if (results.size() >= request[ResultLimit]) resultLimitReached = true;
    }

    void generateWild(const std::uint32_t *request, const Area &area, FrameRng &rng)
    {
        const bool encounterForce = request[Lead] >= 27 && request[Lead] <= 31;
        const auto modified = modifiedSlots(area, request[Lead]);
        const bool feebas = area.location == 22 && request[FeebasTile] != 0;
        for (std::uint32_t index = 0; index < request[ChunkCount]; index++, rng.advanceState())
        {
            std::uint8_t slot = 0;
            if (feebas && rng.next(2) != 0)
            {
                slot = 5;
                rng.advance(encounterForce ? 2 : 1);
            }
            else if (encounterForce && rng.next(2) == 0 && !modified.empty())
                slot = modified[rng.next(static_cast<std::uint32_t>(modified.size()))];
            else slot = encounterSlot(rng.next(100), area.encounter);

            if (!slotSelected(request, slot))
            {
                processedCount++;
                continue;
            }
            const std::uint8_t levelValue = level(rng, area, slot, request[Lead] == 32);
            const Personal &personal = personalData()[area.slots[slot].species];
            bool cuteCharm = false;
            if ((request[Lead] == 25 || request[Lead] == 26) && personal.gender != 0 && personal.gender != 254
                && personal.gender != 255)
                cuteCharm = rng.next(3) != 0;
            const std::uint8_t form
                = area.slots[slot].species == 201 ? unownForm(area.location, rng.next()) : 0;
            rng.advance(84);
            append(request, createState(request, rng, area, request[ChunkStart] + index, slot, levelValue, cuteCharm, form, false));
            processedCount++;
            if (resultLimitReached) break;
        }
    }

    void generateHoney(const std::uint32_t *request, const Area &area, FrameRng &rng)
    {
        const std::uint8_t slot = static_cast<std::uint8_t>(request[HoneyIndex]);
        for (std::uint32_t index = 0; index < request[ChunkCount]; index++, rng.advanceState())
        {
            const std::uint8_t levelValue = level(rng, area, slot, false);
            const Personal &personal = personalData()[area.slots[slot].species];
            bool cuteCharm = false;
            if ((request[Lead] == 25 || request[Lead] == 26) && personal.gender != 0 && personal.gender != 254
                && personal.gender != 255)
                cuteCharm = rng.next(3) != 0;
            rng.advance(84);
            append(request, createState(request, rng, area, request[ChunkStart] + index, slot, levelValue, cuteCharm, 0, true));
            processedCount++;
            if (resultLimitReached) break;
        }
    }

    bool validLead(std::uint32_t lead)
    {
        return lead <= 32 || lead == 34 || lead == 255;
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
            || request[Encounter] > SuperRod || request[Location] > 201 || request[Time] > 2 || request[Radar] > 1
            || request[Swarm] > 1 || request[Replacement0] > 493 || request[Replacement1] > 493
            || request[FeebasTile] > 1 || !validLead(request[Lead]) || request[HoneyIndex] > 11
            || request[FiltersDisabled] > 1 || (request[ShinyFilter] != 255 && request[ShinyFilter] > 3)
            || !validGender || !validAbility || request[NatureMask] == 0
            || (request[NatureMask] & ~allNatures) != 0 || request[HiddenPowerMask] == 0
            || (request[HiddenPowerMask] & ~allHiddenPowers) != 0 || request[SlotMask] == 0
            || request[LevelMin] < 1 || request[LevelMin] > request[LevelMax] || request[LevelMax] > 100
            || request[HeightMin] > request[HeightMax] || request[HeightMax] > 255
            || request[WeightMin] > request[WeightMax] || request[WeightMax] > 255
            || request[PerfectIvValue] > 31 || request[PerfectIvCount] > 6
            || request[ResultLimit] == 0 || request[ResultLimit] > maximumResults || request[NationalDex] > 1)
            return false;
        for (std::size_t index = 0; index < 6; index++)
            if (request[IvMin + index] > request[IvMax + index] || request[IvMax + index] > 31) return false;
        return true;
    }

    bool validArea(const Area &area, const std::uint32_t *request)
    {
        if (area.count == 0 || area.location != request[Location] || area.encounter != request[Encounter]) return false;
        if (request[Encounter] == HoneyTree && request[HoneyIndex] >= area.count) return false;
        const auto &personal = personalData();
        for (std::uint8_t index = 0; index < area.count; index++)
            if (area.slots[index].species == 0 || area.slots[index].species >= personal.size()
                || area.slots[index].minLevel == 0 || area.slots[index].minLevel > area.slots[index].maxLevel)
                return false;
        return true;
    }
}

extern "C"
{
    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_api_version()
    {
        return apiVersion;
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_generate(const std::uint32_t *request)
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
        const Area area = prepareArea(request);
        if (!validArea(area, request))
        {
            lastError = ErrorCode::DataError;
            return 0;
        }
        const std::uint64_t seed0 = (static_cast<std::uint64_t>(request[Seed0High]) << 32) | request[Seed0Low];
        const std::uint64_t seed1 = (static_cast<std::uint64_t>(request[Seed1High]) << 32) | request[Seed1Low];
        FrameRng rng(seed0, seed1, request[InitialAdvances] + request[Offset] + request[ChunkStart]);
        results.reserve(request[ResultLimit]);
        if (request[Encounter] == HoneyTree) generateHoney(request, area, rng);
        else generateWild(request, area, rng);
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uintptr_t gen8wild_result_ptr()
    {
        return reinterpret_cast<std::uintptr_t>(results.data());
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_result_count()
    {
        return static_cast<std::uint32_t>(results.size());
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_processed_count()
    {
        return processedCount;
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_limit_reached()
    {
        return resultLimitReached ? 1 : 0;
    }

    POKERNGKIT_GEN8WILD_KEEPALIVE std::uint32_t gen8wild_last_error()
    {
        return lastError;
    }
}

static_assert(sizeof(PackedResult) == resultWords * sizeof(std::uint32_t));
static_assert(requestWords == 50);
