if(EMSCRIPTEN)
    add_executable(gen4wild bridge/gen4wild_bridge.cpp)
    target_sources(gen4wild PRIVATE
        "${POKEFINDER_ROOT}/Core/Parents/EncounterArea.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/EncounterArea4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Generators/WildGenerator4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Profile4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Searchers/WildSearcher4.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/Profile.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/States/State.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/Filters/StateFilter.cpp"
        "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
        "${POKEFINDER_ROOT}/Core/Util/EncounterSlot.cpp"
        "${POKEFINDER_ROOT}/Core/Util/Nature.cpp"
    )
    target_include_directories(gen4wild PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen4wild PRIVATE "-O3")
    target_link_options(gen4wild PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sEXPORT_NAME=createGen4WildModule" "-sENVIRONMENT=worker" "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0" "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc" "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen4wild_api_version','_gen4wild_generate','_gen4wild_search','_gen4wild_result_ptr','_gen4wild_result_count','_gen4wild_last_error']" "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']")
    set_target_properties(gen4wild PROPERTIES OUTPUT_NAME "gen4wild" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen4wild_native_test bridge/gen4wild_bridge.cpp tests/wild4_native_test.cpp)
    target_sources(gen4wild_native_test PRIVATE
        "${POKEFINDER_ROOT}/Core/Parents/EncounterArea.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/EncounterArea4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Generators/WildGenerator4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Profile4.cpp"
        "${POKEFINDER_ROOT}/Core/Gen4/Searchers/WildSearcher4.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/Profile.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/States/State.cpp"
        "${POKEFINDER_ROOT}/Core/Parents/Filters/StateFilter.cpp"
        "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
        "${POKEFINDER_ROOT}/Core/Util/EncounterSlot.cpp"
        "${POKEFINDER_ROOT}/Core/Util/Nature.cpp"
    )
    target_include_directories(gen4wild_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen4wild_native_parity COMMAND gen4wild_native_test)
endif()
