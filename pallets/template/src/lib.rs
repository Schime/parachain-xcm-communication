//! # Template Pallet
//!
//! A pallet with minimal functionality to help developers understand the essential components of
//! writing a FRAME pallet. It is typically used in beginner tutorials or in Polkadot SDK template
//! as a starting point for creating a new pallet and **not meant to be used in production**.
//!
//! ## Overview
//!
//! This template pallet contains basic examples of:
//! - declaring a storage item that stores a single block-number
//! - declaring and using events
//! - declaring and using errors
//! - a dispatchable function that allows a user to set a new value to storage and emits an event
//!   upon success
//! - another dispatchable function that causes a custom error to be thrown
//!
//! Each pallet section is annotated with an attribute using the `#[pallet::...]` procedural macro.
//! This macro generates the necessary code for a pallet to be aggregated into a FRAME runtime.
//!
//! To get started with pallet development, consider using this tutorial:
//!
//! <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/guides/your_first_pallet/index.html>
//!
//! And reading the main documentation of the `frame` crate:
//!
//! <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/polkadot_sdk/frame_runtime/index.html>
//!
//! And looking at the frame [`kitchen-sink`](https://paritytech.github.io/polkadot-sdk/master/pallet_example_kitchensink/index.html)
//! pallet, a showcase of all pallet macros.
//!
//! ### Pallet Sections
//!
//! The pallet sections in this template are:
//!
//! - A **configuration trait** that defines the types and parameters which the pallet depends on
//!   (denoted by the `#[pallet::config]` attribute). See: [`Config`].
//! - A **means to store pallet-specific data** (denoted by the `#[pallet::storage]` attribute).
//!   See: [`storage_types`].
//! - A **declaration of the events** this pallet emits (denoted by the `#[pallet::event]`
//!   attribute). See: [`Event`].
//! - A **declaration of the errors** that this pallet can throw (denoted by the `#[pallet::error]`
//!   attribute). See: [`Error`].
//! - A **set of dispatchable functions** that define the pallet's functionality (denoted by the
//!   `#[pallet::call]` attribute). See: [`dispatchables`].
//!
//! Run `cargo doc --package pallet-template --open` to view this pallet's documentation.

#![cfg_attr(not(feature = "std"), no_std)]

pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

pub mod weights;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/polkadot_sdk/frame_runtime/index.html>
// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/guides/your_first_pallet/index.html>
//
// To see a full list of `pallet` macros and their use cases, see:
// <https://paritytech.github.io/polkadot-sdk/master/pallet_example_kitchensink/index.html>
// <https://paritytech.github.io/polkadot-sdk/master/frame_support/pallet_macros/index.html>
#[frame::pallet]
pub mod pallet {
	use frame::prelude::*;
	use scale_info::prelude::vec::Vec;

	/// Configure the pallet by specifying the parameters and types on which it depends.
	#[pallet::config]
	pub trait Config: frame_system::Config {
		type RuntimeEvent: From<Event<Self>> + IsType<<Self as frame_system::Config>::RuntimeEvent>;

		/// A type representing the weights required by the dispatchables of this pallet.
		type WeightInfo: crate::weights::WeightInfo;

		/// Maximum bytes allowed for a student's name
		#[pallet::constant]
    	type MaxNameLen: Get<u32>;

		/// Maximum bytes allowed for surname
		#[pallet::constant]
		type MaxSurnameLen: Get<u32>;
	}

	#[pallet::pallet]
	pub struct Pallet<T>(_);

	/// A struct to store a single block-number. Has all the right derives to store it in storage.
	/// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/reference_docs/frame_storage_derives/index.html>
	#[derive(
		Encode, Decode, MaxEncodedLen, TypeInfo, CloneNoBound, PartialEqNoBound, DefaultNoBound,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct CompositeStruct<T: Config> {
		/// A block number.
		pub(crate) block_number: BlockNumberFor<T>,
	}


	// Defining Student structure
	#[derive(
		Encode, Decode, MaxEncodedLen, TypeInfo,
		CloneNoBound, PartialEqNoBound, DefaultNoBound,
	)]
	#[scale_info(skip_type_params(T))]
	pub struct Student<T: Config> {
		pub name: BoundedVec<u8, T::MaxNameLen>,
		pub surname: BoundedVec<u8, T::MaxSurnameLen>,
		pub age: u32,
		pub gender: u32,
		pub has_graduated: bool,
	}







	/// The pallet's storage items.
	/// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/guides/your_first_pallet/index.html#storage>
	/// <https://paritytech.github.io/polkadot-sdk/master/frame_support/pallet_macros/attr.storage.html>

	/// Stores a Student for each account.
	#[pallet::storage]
	pub type StudentCount<T> = StorageValue<_, u32, ValueQuery>;

	#[pallet::storage]
	pub type Students<T: Config> =
		StorageMap<_, Blake2_128Concat, u32, Student<T>, OptionQuery>;

	#[pallet::storage]
	pub type StudentsByOwner<T: Config> = StorageMap<
		_,
		Blake2_128Concat,
		T::AccountId,
		BoundedVec<u32, ConstU32<100>>, // max 100 students per account
		ValueQuery,
	>;



	#[pallet::event]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		SomethingStored { block_number: BlockNumberFor<T>, who: T::AccountId },

		StudentCreated { who: T::AccountId },
		StudentDeleted { who: T::AccountId, student_id: u32 },
	}


	/// Errors inform users that something went wrong.
	/// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/guides/your_first_pallet/index.html#event-and-error>
	#[pallet::error]
	pub enum Error<T> {
		NoneValue,
		StorageOverflow,
		NameTooLong,
		SurnameTooLong,
		StudentAlreadyExists,
		MaxStudentsReached,
		StudentNotFound,
		NotStudentOwner,
		AlreadyGraduated,
	}

	#[pallet::hooks]
	impl<T: Config> Hooks<BlockNumberFor<T>> for Pallet<T> {}

	/// Dispatchable functions allows users to interact with the pallet and invoke state changes.
	/// These functions materialize as "extrinsics", which are often compared to transactions.
	/// Dispatchable functions must be annotated with a weight and must return a DispatchResult.
	/// <https://paritytech.github.io/polkadot-sdk/master/polkadot_sdk_docs/guides/your_first_pallet/index.html#dispatchables>
	#[pallet::call]
	impl<T: Config> Pallet<T> {

		// CREATE STUDENT
		#[pallet::call_index(0)]
		#[pallet::weight(10_000)]
		pub fn create_student(
			origin: OriginFor<T>,
			name: Vec<u8>,
			surname: Vec<u8>,
			age: u32,
			gender: u32,
			has_graduated: bool,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Convert name → bounded
			let name: BoundedVec<_, T::MaxNameLen> =
				name.try_into().map_err(|_| Error::<T>::NameTooLong)?;

			let surname: BoundedVec<_, T::MaxSurnameLen> =
				surname.try_into().map_err(|_| Error::<T>::SurnameTooLong)?;

			// Generate new student ID
			let student_id = StudentCount::<T>::get();
			StudentCount::<T>::put(student_id + 1);

			// Build student struct
			let student = Student::<T> {
				name,
				surname,
				age,
				gender,
				has_graduated,
			};

			// Insert into Students map
			Students::<T>::insert(student_id, student);

			// Add student's ID into student's owner list
			StudentsByOwner::<T>::try_mutate(&who, |list| {
				list.try_push(student_id)
					.map_err(|_| Error::<T>::MaxStudentsReached)
			})?;

			Ok(())
		}


		// GRADUATE STUDENT
		#[pallet::call_index(1)]
		#[pallet::weight(10_000)]
		pub fn graduate_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the student exists
			Students::<T>::try_mutate(student_id, |maybe_student| {
				let student = maybe_student.as_mut().ok_or(Error::<T>::StudentNotFound)?;

				// Ensure the caller owns this student
				let owned_ids = StudentsByOwner::<T>::get(&who);
				if !owned_ids.contains(&student_id) {
					return Err(Error::<T>::NotStudentOwner);
				}

				// Ensure student is not already graduated
				if student.has_graduated {
					return Err(Error::<T>::AlreadyGraduated);
				}

				// Mutate state: graduate the student
				student.has_graduated = true;

				Ok(())
			})?;

			Ok(())
		}


		// DELETE STUDENT
		#[pallet::call_index(2)]
		#[pallet::weight(10_000)]
		pub fn delete_student(
			origin: OriginFor<T>,
			student_id: u32,
		) -> DispatchResult {
			let who = ensure_signed(origin)?;

			// Ensure the student exists
			let exists = Students::<T>::contains_key(student_id);
			ensure!(exists, Error::<T>::StudentNotFound);

			// Ensure the caller owns this student
			StudentsByOwner::<T>::try_mutate(&who, |owned_ids| {
				if let Some(index) = owned_ids.iter().position(|id| *id == student_id) {
					owned_ids.swap_remove(index); // efficient removal
					Ok(())
				} else {
					Err(Error::<T>::NotStudentOwner)
				}
			})?;

			// Remove the student record
			Students::<T>::remove(student_id);

			// Emit event
			Self::deposit_event(Event::StudentDeleted { who, student_id });

			Ok(())
		}
	}
}