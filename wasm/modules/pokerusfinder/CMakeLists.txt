if(EMSCRIPTEN)
    add_executable(pokerusfinder bridge/pokerusfinder_bridge.cpp)
    target_include_directories(pokerusfinder PRIVATE bridge)
    target_compile_options(pokerusfinder PRIVATE "-O3")
    target_link_options(
        pokerusfinder
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createPokerusFinderModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_pokerusfinder_api_version','_pokerusfinder_search_gen3','_pokerusfinder_search_pthgss','_pokerusfinder_result_ptr','_pokerusfinder_result_count','_pokerusfinder_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        pokerusfinder
        PROPERTIES
        OUTPUT_NAME "pokerusfinder"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(pokerusfinder_native_test bridge/pokerusfinder_bridge.cpp tests/pokerusfinder_native_test.cpp)
    target_include_directories(pokerusfinder_native_test PRIVATE bridge)
    add_test(NAME pokerusfinder_native_parity COMMAND pokerusfinder_native_test)
endif()
