#include "gen4advance_bridge.h"

#include <cassert>
#include <cstdint>

int main()
{
    assert(gen4advance_api_version() == 1);

    const Gen4AdvancePackedRow calls[] = {
        { 40, 0 }, { 41, 1 }, { 42, 2 }, { 43, 0 }, { 44, 1 }, { 45, 2 },
    };
    const std::uint32_t callTokens[] = { 0, 1, 2 };
    assert(gen4advance_search(0, calls, 6, callTokens, 3) == 2);
    const auto *callMatches = reinterpret_cast<const Gen4AdvancePackedMatch *>(gen4advance_result_ptr());
    assert(callMatches[0].row == 0 && callMatches[0].advances == 40);
    assert(callMatches[1].row == 3 && callMatches[1].advances == 43);

    const Gen4AdvancePackedRow chatot[] = {
        { 100, 83 }, { 101, 72 }, { 102, 55 }, { 103, 31 }, { 104, 19 }, { 105, 65 },
    };
    const std::uint32_t chatotTokens[] = { 6, 3, 9 };
    assert(gen4advance_search(1, chatot, 6, chatotTokens, 3) == 1);
    const auto *chatotMatches = reinterpret_cast<const Gen4AdvancePackedMatch *>(gen4advance_result_ptr());
    assert(chatotMatches[0].row == 1 && chatotMatches[0].advances == 101);

    const std::uint32_t invalidToken[] = { 10 };
    assert(gen4advance_search(1, chatot, 6, invalidToken, 1) == 0);
    assert(gen4advance_last_error() == 1);

    const Gen4AdvancePackedRow invalidCall[] = { { 0, 3 } };
    assert(gen4advance_search(0, invalidCall, 1, callTokens, 1) == 0);
    assert(gen4advance_last_error() == 1);
    assert(gen4advance_search(2, calls, 6, callTokens, 3) == 0);
    assert(gen4advance_last_error() == 1);
    assert(gen4advance_search(0, nullptr, 1, callTokens, 1) == 0);
    assert(gen4advance_last_error() == 1);
    assert(gen4advance_search(0, calls, 1000001, callTokens, 1) == 0);
    assert(gen4advance_last_error() == 2);
    assert(gen4advance_search(0, calls, 1, callTokens, 100001) == 0);
    assert(gen4advance_last_error() == 3);
    return 0;
}
