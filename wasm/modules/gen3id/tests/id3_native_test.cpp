#include "../bridge/gen3id_bridge.h"

#include <array>
#include <cassert>
#include <cstdint>

namespace
{
    struct ExpectedState
    {
        std::uint32_t advances;
        std::uint16_t tid;
        std::uint16_t sid;
        std::uint16_t tsv;
    };

    void verify(Id3Mode mode, std::uint32_t input, const std::array<ExpectedState, 10> &expected)
    {
        const auto count = gen3id_generate(static_cast<std::uint32_t>(mode), input, 0, 9, 0, 0, 0, 0, 0, 0);
        assert(gen3id_last_error() == 0);
        assert(count == expected.size());

        const auto *states = reinterpret_cast<const Id3PackedState *>(gen3id_result_ptr());
        for (std::size_t i = 0; i < expected.size(); i++)
        {
            assert(states[i].advances == expected[i].advances);
            assert((states[i].tidSID & 0xffff) == expected[i].tid);
            assert((states[i].tidSID >> 16) == expected[i].sid);
            assert(states[i].tsv == expected[i].tsv);
        }
    }

    void verifySearchState(const Id3PackedSearchState &state, std::uint32_t seed, std::uint32_t frame,
                           std::uint16_t tid, std::uint16_t sid, std::uint16_t tsv, std::uint8_t shiny,
                           std::uint8_t month, std::uint8_t day, std::uint8_t hour, std::uint8_t minute)
    {
        assert(state.seed == seed);
        assert(state.frame == frame);
        assert((state.tidSID & 0xffff) == tid);
        assert((state.tidSID >> 16) == sid);
        assert((state.tsvShiny & 0xffff) == tsv);
        assert((state.tsvShiny >> 16) == shiny);
        assert((state.yearMonthDay & 0xffff) == 2000);
        assert(((state.yearMonthDay >> 16) & 0xff) == month);
        assert((state.yearMonthDay >> 24) == day);
        assert((state.hourMinute & 0xff) == hour);
        assert(((state.hourMinute >> 8) & 0xff) == minute);
    }
}

int main()
{
    verify(Id3Mode::XDColo, 0,
           { { { 0, 38, 7719, 960 }, { 1, 7719, 54006, 6554 }, { 2, 54006, 2437, 7022 },
                 { 3, 2437, 41623, 5474 }, { 4, 41623, 11797, 4496 }, { 5, 11797, 8365, 471 },
                 { 6, 8365, 32285, 3030 }, { 7, 32285, 43218, 6873 }, { 8, 43218, 30612, 7144 },
                 { 9, 30612, 38621, 7209 } } });

    verify(Id3Mode::FRLGE, 0,
           { { { 0, 0, 0, 0 }, { 1, 0, 59774, 7471 }, { 2, 0, 21105, 2638 }, { 3, 0, 12720, 1590 },
                 { 4, 0, 36418, 4552 }, { 5, 0, 58060, 7257 }, { 6, 0, 44997, 5624 },
                 { 7, 0, 26587, 3323 }, { 8, 0, 64563, 8070 }, { 9, 0, 61228, 7653 } } });

    verify(Id3Mode::RS, 0,
           { { { 0, 59774, 0, 7471 }, { 1, 21105, 59774, 5985 }, { 2, 12720, 21105, 3192 },
                 { 3, 36418, 12720, 6142 }, { 4, 58060, 36418, 3473 }, { 5, 44997, 58060, 2465 },
                 { 6, 26587, 44997, 6403 }, { 7, 64563, 26587, 4989 }, { 8, 61228, 64563, 611 },
                 { 9, 64606, 61228, 622 } } });

    assert(gen3id_generate(static_cast<std::uint32_t>(Id3Mode::FRLGE), 0, 0, 9, FilterSID, 0, 59774, 0, 0, 0) == 1);
    assert(gen3id_generate(99, 0, 0, 0, 0, 0, 0, 0, 0, 0) == 0);
    assert(gen3id_last_error() == 1);

    auto count = gen3id_search(static_cast<std::uint32_t>(Id3SearchMode::SID), 48163, 64377);
    assert(gen3id_last_error() == 0);
    assert(count == 2);
    auto *searchStates = reinterpret_cast<const Id3PackedSearchState *>(gen3id_result_ptr());
    verifySearchState(searchStates[0], 0x05a0, 0, 48163, 64377, 2283, 0, 1, 1, 0, 0);
    verifySearchState(searchStates[1], 0xc19b, 36724, 48163, 64377, 2283, 0, 2, 2, 22, 3);

    count = gen3id_search(static_cast<std::uint32_t>(Id3SearchMode::PID), 48163, 0x0000475a);
    assert(gen3id_last_error() == 0);
    assert(count == 7);
    searchStates = reinterpret_cast<const Id3PackedSearchState *>(gen3id_result_ptr());
    verifySearchState(searchStates[0], 0x05a0, 0, 48163, 64377, 2283, 2, 1, 1, 0, 0);
    assert((searchStates[2].tsvShiny >> 16) == 1);

    assert(gen3id_search(static_cast<std::uint32_t>(Id3SearchMode::SID), 4, 0) == 0);
    assert(gen3id_result_count() == 0);
    assert(gen3id_search(static_cast<std::uint32_t>(Id3SearchMode::SID), 0x10000, 0) == 0);
    assert(gen3id_last_error() == 2);
}
