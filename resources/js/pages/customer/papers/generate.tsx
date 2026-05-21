export default function GeneratePaper() {
    return (
        <>
            <div>
                <div className="flex items-center gap-2">
                    <div><select name="patterns" id="patterns"></select></div>
                    <div><select name="classes" id="classes"></select></div>
                    <div><select name="subjects" id="subjects"></select></div>
                </div>

                {/* This is a chapters grid, will show after the above selection.*/}
                <div className="hidden">

                </div>

                <div className="flex items-center gap-2 justify-end">
                    <button>Cancel</button>
                    <button>Reset</button>
                    <button>Next</button>
                </div>
            </div>
        </>
    );
}
